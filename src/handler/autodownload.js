// ─── Info ─────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/handler/autodownload.js ─────────────────

import util from 'util';
import { delay } from 'baileys';
import log from '../lib/logger.js';
import config from '../../config.js';
import instagram from '../utils/igdl.js';
import { exec as cp_exec } from 'child_process';
import { mergeVideoAudio } from '../addon/bridge.js';
import { performanceManager } from '../lib/performanceManager.js';
import { fetchTikTokData, buildBaseCaption, chunkArray, sendImages, normalizeResult } from '../function/index.js';

const exec = util.promisify(cp_exec);

class AutoDownloadHandler {
  constructor() {
    this.platforms = [
      { name: 'tiktok', regex: /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i, handler: this.handleTikTok },
      { name: 'facebook', regex: /^https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/[^\s]+/i, handler: this.handleFacebook },
      { name: 'instagram', regex: /^https?:\/\/(www\.)?instagram\.com\/(s|p|reel|stories|tv)\/([a-zA-Z0-9\-_]+)/i, handler: this.handleInstagram },
      { name: 'twitter', regex: /^https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/i, handler: this.handleTwitter },
    ];
  }
  async handle(params) {
    const { body } = params;
    if (!body) return;
    for (const platform of this.platforms) {
      if (body.match(platform.regex)) {
        log(`Auto Downloader terpicu untuk platform: ${platform.name}`);
        await platform.handler.call(this, params);
        return;
      }
    }
  }
  async handleInstagram(params) {
    const { body, fn, toId, m, user, sReply } = params;
    try {
      const urlMatch = body.match(/https?:\/\/(www\.)?instagram\.com\/[^\s]+/);
      if (!urlMatch) return;
      const url = urlMatch[0];
      const data = await instagram(url);
      if (!data) return;
      if (data.post_info) {
        const postInfo = data.post_info;
        const mediaUrls = data.url_list;
        const baseCaption = `📷 *Instagram Downloader*\n\n` +
          `👤 *Username:* ${postInfo.owner_username}\n` +
          `❤️ *Likes:* ${postInfo.likes}\n` +
          `📝 *Caption:* ${postInfo.caption || '(Tidak ada caption)'}`;
        if (mediaUrls.length <= 1) {
          await fn.sendFileUrl(toId, mediaUrls[0], baseCaption, m);
        } else {
          const createMediaObjectFromUrl = (url, caption) => {
            return url.includes('.mp4') ? { video: { url: url }, caption: caption } : { image: { url: url }, caption: caption };
          };
          const mediaToSend = mediaUrls.map((url, index) => {
            const caption = `${baseCaption}\n\n🖼️ *File ${index + 1} dari ${mediaUrls.length}*`;
            return createMediaObjectFromUrl(url, caption);
          });
          const chunks = chunkArray(mediaToSend, 100);
          for (const [index, chunk] of chunks.entries()) {
            await fn.sendAlbum(toId, chunk, { quoted: m });
            if (chunks.length > 1 && index < chunks.length - 1) {
              await delay(2000);
            }
          }
        }
      } else if (data.media_details && data.media_details.length > 0) {
        const mediaDetails = data.media_details;
        if (mediaDetails.length === 1) {
          await fn.sendFileUrl(toId, mediaDetails[0].url, `📸 *Instagram Story/Highlight*`, m);
        } else {
          const createMediaObject = (media, caption) => {
            return media.type === 'video' ? { video: { url: media.url }, caption: caption } : { image: { url: media.url }, caption: caption };
          };
          const mediaToSend = mediaDetails.map((mediaItem, index) => {
            const caption = `📸 *Instagram Story/Highlight*\n\n🖼️ *Item ${index + 1} dari ${mediaDetails.length}*`;
            return createMediaObject(mediaItem, caption);
          });
          const chunks = chunkArray(mediaToSend, 100);
          for (const [index, chunk] of chunks.entries()) {
            await fn.sendAlbum(toId, chunk, { quoted: m });
            if (chunks.length > 1 && index < chunks.length - 1) {
              await delay(2000);
            }
          }
        }
      }
      await performanceManager.cache.updateUserStats(user.userId, { $inc: { userCount: 1 } });
      performanceManager.cache.incrementGlobalStats();
    } catch (error) {
      log(`Error autodownload Instagram: ${error.message}`, true);
      await sReply(`Gagal mengunduh dari Instagram. Error: ${error.message}`);
    }
  }
  async handleTikTok(params) {
    const { body, fn, toId, m, user } = params;
    try {
      const urlMatch = body.match(/https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+/);
      if (!urlMatch) return;
      const url = urlMatch[0];
      const versions = ['v1', 'v2', 'v3'];
      let result = null;
      let lastError = null;
      for (const version of versions) {
        try {
          result = await Promise.race([
            fetchTikTokData(url, version),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout (${version})`)), 15000)
            )
          ]);
          if (result) break;
        } catch (error) {
          lastError = error;
          continue;
        }
      }
      if (!result) {
        log(`Auto-download TikTok gagal: ${lastError?.message}`, true);
        return;
      }
      const normalizedResult = normalizeResult(result);
      const baseCaption = buildBaseCaption(normalizedResult);
      if (normalizedResult.type === 'video' && normalizedResult.videoUrl) {
        await fn.sendFromTiktok(toId, normalizedResult.videoUrl, baseCaption, m);
      } else if (normalizedResult.type === 'image' && normalizedResult.images?.length > 0) {
        await sendImages(fn, normalizedResult, [], toId, m, baseCaption);
      }
      await performanceManager.cache.updateUserStats(user.userId, { $inc: { userCount: 1 } });
      performanceManager.cache.incrementGlobalStats();
    } catch (error) {
      log(`Error autodownload TikTok: ${error.message}`, true);
    }
  }
  async handleFacebook(params) {
    const { body, fn, toId, m, dbSettings, user } = params;
    try {
      const urlMatch = body.match(/https?:\/\/(?:www\.|m\.|web\.)?facebook\.com\/[^\s]+/);
      if (!urlMatch) return;
      const input = urlMatch[0];
      const downloadVideoCmd = `${config.paths.ytDlpPath} -f "bestvideo[ext=mp4]" -o - "${input}"`;
      const { stdout: videoBuffer } = await exec(downloadVideoCmd, {
        shell: '/bin/bash',
        encoding: 'buffer',
        maxBuffer: 200 * 1024 * 1024
      });
      const downloadAudioCmd = `${config.paths.ytDlpPath} -f "bestaudio[ext=m4a]" -o - "${input}"`;
      const { stdout: audioBuffer } = await exec(downloadAudioCmd, {
        shell: '/bin/bash',
        encoding: 'buffer',
        maxBuffer: 200 * 1024 * 1024
      });
      const finalBuffer = mergeVideoAudio(videoBuffer, audioBuffer, {
        preset: 'ultrafast',
        crf: 28
      });
      await fn.sendMediaFromBuffer(toId, 'video/mp4', finalBuffer, dbSettings.autocommand, m);
      await performanceManager.cache.updateUserStats(user.userId, { $inc: { userCount: 1 } });
      performanceManager.cache.incrementGlobalStats();
    } catch (error) {
      log(`Error autodownload Facebook: ${error.message}`, true);
    }
  }

  async handleTwitter(params) {
    const { body, fn, toId, m, dbSettings, user } = params;
    try {
      const urlMatch = body.match(/https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\/[^\s]+/);
      if (!urlMatch) return;
      const input = urlMatch[0];
      const downloadVideoCmd = `${config.paths.ytDlpPath} -f "bestvideo[ext=mp4]" -o - "${input}"`;
      const { stdout: videoBuffer } = await exec(downloadVideoCmd, {
        shell: '/bin/bash',
        encoding: 'buffer',
        maxBuffer: 200 * 1024 * 1024
      });
      const downloadAudioCmd = `${config.paths.ytDlpPath} -f "bestaudio[ext=m4a]" -o - "${input}"`;
      const { stdout: audioBuffer } = await exec(downloadAudioCmd, {
        shell: '/bin/bash',
        encoding: 'buffer',
        maxBuffer: 200 * 1024 * 1024
      });
      const finalBuffer = mergeVideoAudio(videoBuffer, audioBuffer, {
        preset: 'ultrafast',
        crf: 28
      });
      await fn.sendMediaFromBuffer(toId, 'video/mp4', finalBuffer, dbSettings.autocommand, m);
      await performanceManager.cache.updateUserStats(user.userId, { $inc: { userCount: 1 } });
      performanceManager.cache.incrementGlobalStats();
    } catch (error) {
      log(`Error autodownload Twitter/X: ${error.message}`, true);
    }
  }
}

export const handleAutoDownload = async (params) => {
  const handler = new AutoDownloadHandler();
  return handler.handle(params);
};