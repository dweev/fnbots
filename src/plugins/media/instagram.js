// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import instagram from '../../utils/igdl.js';
import { delay } from 'baileys';
import { parseImageSelection, chunkArray } from '../../function/index.js';

export const command = {
  name: 'instagram',
  category: 'media',
  description: 'Download media dari Instagram',
  isLimitCommand: true,
  aliases: ['ig', 'igdl'],
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, args, sReply }) => {
    let url;
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      url = quotedMsg?.body.trim();
    } else if (args.length > 0) {
      url = args[0];
    } else {
      return await sReply(`Silakan balas pesan berisi link Instagram atau kirim linknya langsung.\nContoh: ${dbSettings.rname}ig https://...`);
    }
    if (!/^https?:\/\/(www\.)?instagram\.com(\/|$)/.test(url)) return await sReply("URL yang Kamu berikan sepertinya bukan link Instagram yang valid.");
    const data = await instagram(url);
    if (!data) return await sReply("Gagal mengambil data dari Instagram. Pastikan link valid dan tidak private.");
    if (data.post_info) {
      const postInfo = data.post_info;
      const mediaUrls = data.url_list;
      const baseCaption =
        `📷 *Instagram Downloader*\n\n` +
        `👤 *Username:* ${postInfo.owner_username}\n` +
        `❤️ *Likes:* ${postInfo.likes}\n` +
        `📝 *Caption:* ${postInfo.caption || '(Tidak ada caption)'}`;
      if (mediaUrls.length <= 1) {
        await fn.sendFileUrl(toId, mediaUrls[0], baseCaption, m);
      } else {
        const createMediaObjectFromUrl = (url, caption) => {
          if (url.includes('.mp4')) {
            return { video: { url: url }, caption: caption };
          } else {
            return { image: { url: url }, caption: caption };
          }
        };
        const selection = args[1];
        let mediaToSend;
        if (selection) {
          const indicesToDownload = parseImageSelection(selection, mediaUrls.length);
          if (indicesToDownload.length === 0) return await sReply(`Format pemilihan slide salah!\nTotal: ${mediaUrls.length}\nContoh: ${dbSettings.rname}ig [url] 1,3,5 atau ${dbSettings.rname}ig [url] 2-5`);
          mediaToSend = indicesToDownload.map(index => {
            const url = mediaUrls[index];
            const caption = `${baseCaption}\n\n📌 *File Pilihan ${index + 1} dari ${mediaUrls.length}*`;
            return createMediaObjectFromUrl(url, caption);
          });
        } else {
          mediaToSend = mediaUrls.map((url, index) => {
            const caption = `${baseCaption}\n\n🖼️ *File ${index + 1} dari ${mediaUrls.length}*`;
            return createMediaObjectFromUrl(url, caption);
          });
        }
        const chunks = chunkArray(mediaToSend, 100);
        for (const [index, chunk] of chunks.entries()) {
          await fn.sendAlbum(toId, chunk, { quoted: m });
          if (chunks.length > 1 && index < chunks.length - 1) {
            await delay(2000);
          }
        }
      }
    } else if (data.media_details && data.media_details.length > 0) {
      if (data.media_details.length === 1) {
        await fn.sendFileUrl(toId, data.media_details[0].url, dbSettings.autocommand, m);
      } else {
        const mediaDetails = data.media_details;
        const selection = args[1];
        let mediaToSend;
        const createMediaObject = (media, caption) => {
          if (media.type === 'video') {
            return { video: { url: media.url }, caption: caption };
          } else {
            return { image: { url: media.url }, caption: caption };
          }
        };
        if (selection) {
          const indicesToDownload = parseImageSelection(selection, mediaDetails.length);
          if (indicesToDownload.length === 0) return await sReply(`Format pemilihan salah!\nTotal: ${mediaDetails.length}\nContoh: ${dbSettings.rname}ig [url] 1,3,5 atau ${dbSettings.rname}ig [url] 2-5`);
          mediaToSend = indicesToDownload.map(index => {
            const mediaItem = mediaDetails[index];
            const caption = `📸 *Instagram*\n\n📌 *Item Pilihan ${index + 1} dari ${mediaDetails.length}*`;
            return createMediaObject(mediaItem, caption);
          });
        } else {
          mediaToSend = mediaDetails.map((mediaItem, index) => {
            const caption = `📸 *Instagram*\n\n🖼️ *Item ${index + 1} dari ${mediaDetails.length}*`;
            return createMediaObject(mediaItem, caption);
          });
        }
        const chunks = chunkArray(mediaToSend, 100);
        for (const [index, chunk] of chunks.entries()) {
          await fn.sendAlbum(toId, chunk, { quoted: m });
          if (chunks.length > 1 && index < chunks.length - 1) {
            await delay(2000);
          }
        }
      }
    } else {
      return await sReply("Gagal memproses media. Pastikan link benar dan tidak private.");
    }
  }
};