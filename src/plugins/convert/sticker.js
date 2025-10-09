// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import config from '../../../config.js';
import { runJob } from '../../worker/worker_manager.js';
import { fetch as nativeFetch } from '../../addon/bridge.js';

export const command = {
  name: 'sticker',
  category: 'convert',
  description: 'Membuat stiker dari gambar atau video (maks 10 detik). Bisa juga dari URL.',
  aliases: ['s', 'stiker'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, dbSettings, arg, args, quotedMsg, toId, sReply }) => {
    const [name, author] = (arg || '').split('|').map(str => str?.trim());
    const pack = { packName: name || dbSettings.packName, authorName: author || dbSettings.packAuthor };
    let buffer;
    if (args[0]?.match(/^https?:\/\//)) {
      const response = await nativeFetch(args[0], {
        timeout: config.performance.axiosTimeout
      });
      if (!response.ok) {
        return await sReply(`Gagal mengunduh dari URL: ${response.status} ${response.statusText}`);
      }
      buffer = await response.arrayBuffer();
    } else {
      const targetMsg = quotedMsg ? m.quoted || m : m.message;
      if (!targetMsg) return await sReply("Balas gambar/video atau kirim media dengan caption .sticker");
      buffer = await fn.getMediaBuffer(targetMsg);
      if (targetMsg.mime?.includes('video')) {
        if ((targetMsg?.videoMessage?.seconds || 0) > 20) {
          return await sReply("Durasi video melebihi 20 detik");
        }
      }
    }
    if (!buffer || buffer.length < 100) {
      return await sReply("Ukuran media tidak valid atau gagal diunduh.");
    }
    const stickerBuffer = await runJob('stickerNative', {
      mediaBuffer: buffer,
      ...pack
    });
    if (!Buffer.isBuffer(stickerBuffer) || stickerBuffer.length === 0) {
      return await sReply('Worker gagal menghasilkan buffer stiker yang valid.');
    }
    await fn.sendMessage(toId, { sticker: stickerBuffer }, { quoted: m });
  }
};