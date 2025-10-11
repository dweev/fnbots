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
  description: 'Membuat stiker dari gambar atau video (maks 10 detik). Bisa juga dari URL.\nPenggunaan:\n- .s (reply media)\n- .s --crop (dengan crop)\n- .s nama|author\n- .s url --crop\n- .s nama|author --crop',
  aliases: ['s', 'stiker', 'wm'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, dbSettings, arg, args, quotedMsg, toId, sReply }) => {
    const pack = {
      packName: dbSettings.packName,
      authorName: dbSettings.packAuthor,
      crop: false
    };
    let buffer;
    const hasCropFlag = args.some(a => a === '--crop');
    if (hasCropFlag) {
      pack.crop = true;
      args = args.filter(a => a !== '--crop');
      arg = args.join(' ');
    }
    if (args[0]?.match(/^https?:\/\//)) {
      try {
        const response = await nativeFetch(args[0], {
          timeout: config.performance.axiosTimeout
        });
        if (!response.ok) return await sReply(`Gagal mengunduh dari URL: ${response.status} ${response.statusText}`);
        buffer = await response.arrayBuffer();
      } catch (error) {
        return await sReply(`Error mengunduh dari URL: ${error.message}`);
      }
    } else {
      if (arg && arg.includes('|')) {
        const parts = arg.split('|').map(s => s.trim());
        if (parts.length >= 2 && parts[0] && parts[1]) {
          pack.packName = parts[0];
          pack.authorName = parts[1];
        } else {
          return await sReply('Format watermark salah! Gunakan: nama|author\nContoh: .s MyPack|FN\nAtau reply media tanpa text untuk watermark default.');
        }
      }
      const targetMsg = quotedMsg ? m.quoted || m : m.message;
      if (!targetMsg) return await sReply("Balas gambar/video atau kirim media dengan caption .sticker\n\nContoh penggunaan:\n- .s (reply media)\n- .s --crop\n- .s nama|author\n- .s https://url.com/image.jpg\n- .s nama|author --crop");
      const isMedia = !!(targetMsg.imageMessage || targetMsg.videoMessage || targetMsg.stickerMessage);
      if (!isMedia) return await sReply("Media tidak valid! Pastikan yang Anda balas adalah gambar atau video.");
      buffer = await fn.getMediaBuffer(targetMsg);
      if (targetMsg.mime?.includes('video')) {
        const duration = targetMsg?.videoMessage?.seconds || 0;
        if (duration > 20) return await sReply("Durasi video melebihi 20 detik");
      }
    }
    if (!buffer || buffer.length < 100) return await sReply("Ukuran media tidak valid atau gagal diunduh.");
    const stickerBuffer = await runJob('stickerNative', {
      mediaBuffer: buffer,
      ...pack
    });
    if (!Buffer.isBuffer(stickerBuffer) || stickerBuffer.length === 0) return await sReply('Worker gagal menghasilkan buffer stiker yang valid.');
    await fn.sendMessage(toId, { sticker: stickerBuffer }, { quoted: m });
  }
};