// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';
import config from '../../../config.js';

export const command = {
  name: 'sticker',
  category: 'convert',
  description: 'Membuat stiker dari gambar atau video (maks 10 detik). Bisa juga dari URL gambar/video/gif.',
  aliases: ['s', 'stiker'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, dbSettings, arg, args, quotedMsg, toId, sReply }) => {
    const [name, author] = (arg || '').split('|').map(str => str?.trim().substring(0, 10));
    const pack = { packname: (name || dbSettings.packName || '').substring(0, 10), author: (author || dbSettings.packAuthor || '').substring(0, 10) };
    let buffer;
    if (args[0]?.match(/^https?:\/\//)) {
      const response = await axios.get(args[0], { responseType: 'arraybuffer', timeout: config.performance.axiosTimeout, maxContentLength: config.performance.maxContentLength });
      const contentType = response.headers['content-type'];
      if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) return await sReply('URL harus mengarah ke gambar/video yang valid');
      buffer = response.data;
    } else {
      const targetMsg = quotedMsg ? m.quoted || m : m.message;
      if (!targetMsg) return await sReply("Balas gambar/video atau kirim media dengan caption .sticker");
      const mime = [targetMsg.imageMessage?.mimetype, targetMsg.videoMessage?.mimetype, targetMsg.stickerMessage?.mimetype, targetMsg.documentMessage?.mimetype].find(Boolean) || '';
      const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'image/webp', 'image/gif'];
      if (!allowedTypes.some(type => mime.includes(type))) return await sReply(`Format ${mime} tidak didukung. Gunakan: ${allowedTypes.join(', ')}`);
      buffer = await Promise.race([fn.getMediaBuffer(targetMsg), new Promise((_, reject) => setTimeout(() => reject(new Error('Waktu unduh habis')), config.performance.defaultTimeoutMs))]);
      if (mime.includes('video') || mime.includes('gif')) {
        const duration = targetMsg.videoMessage?.seconds || (targetMsg.documentMessage?.fileLength || 0) / 1000;
        if (duration > 20) return await sReply("Durasi melebihi 15 detik");
      }
    }
    if (!buffer || buffer.length < 100 || buffer.length > config.performance.maxContentLength) return await sReply("Ukuran media tidak valid (min 100B, max 5MB)");
    await fn.sendRawWebpAsSticker(toId, buffer, m, pack);
  }
};