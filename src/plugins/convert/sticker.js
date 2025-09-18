// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';
import log from '../../utils/logger.js';

export const command = {
  name: 'sticker',
  category: 'convert',
  description: 'Membuat stiker dari gambar atau video (maks 10 detik). Bisa juga dari URL gambar/video/gif.',
  aliases: ['s', 'stiker'],
  execute: async ({ fn, m, dbSettings, arg, args, quotedMsg, toId }) => {
    const [name, author] = (arg || '').split('|').map(str => str?.trim().substring(0, 10));
    const pack = { packname: (name || dbSettings.packName || '').substring(0, 10), author: (author || dbSettings.packAuthor || '').substring(0, 10) };
    let buffer;
    if (args[0]?.match(/^https?:\/\//)) {
      try {
        const response = await axios.get(args[0], { responseType: 'arraybuffer', timeout: 10000, maxContentLength: 5 * 1024 * 1024 });
        const contentType = response.headers['content-type'];
        if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) throw new Error('URL harus mengarah ke gambar/video yang valid');
        buffer = response.data;
      } catch (error) {
        throw new Error(`Gagal memproses URL: ${error.message.includes('timeout') ? 'Waktu unduh habis' : 'URL tidak valid'}`);
      }
    } else {
      const targetMsg = quotedMsg ? m.quoted || m : m.message;
      if (!targetMsg) throw new Error("Balas gambar/video atau kirim media dengan caption .sticker");
      const mime = [targetMsg.imageMessage?.mimetype, targetMsg.videoMessage?.mimetype, targetMsg.stickerMessage?.mimetype, targetMsg.documentMessage?.mimetype].find(Boolean) || '';
      const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4', 'image/webp', 'image/gif'];
      if (!allowedTypes.some(type => mime.includes(type))) throw new Error(`Format ${mime} tidak didukung. Gunakan: ${allowedTypes.join(', ')}`);
      try {
        buffer = await Promise.race([fn.getMediaBuffer(targetMsg), new Promise((_, reject) => setTimeout(() => reject(new Error('Waktu unduh habis')), 15000))]);
      } catch (error) {
        throw new Error(`Gagal mengambil media: ${error.message}`);
      }
      if (mime.includes('video') || mime.includes('gif')) {
        const duration = targetMsg.videoMessage?.seconds || (targetMsg.documentMessage?.fileLength || 0) / 1000;
        if (duration > 20) throw new Error("Durasi melebihi 10 detik");
      }
    }
    if (!buffer || buffer.length < 100 || buffer.length > 5 * 1024 * 1024) throw new Error("Ukuran media tidak valid (min 100B, max 5MB)");
    try {
      await fn.sendRawWebpAsSticker(toId, buffer, m, pack);
    } catch (error) {
      log(`Conversion Error ${error}`);
      throw new Error("Gagal membuat stiker. Coba media lain.");
    }
  }
};