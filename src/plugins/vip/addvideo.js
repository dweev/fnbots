// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import log from '../../lib/logger.js';
import { tmpDir } from '../../lib/tempManager.js';
import { Media, saveMediaStream } from '../../../database/index.js';

export const command = {
  name: 'addvideo',
  category: 'vip',
  description: 'Menyimpan video ke database dengan nama kunci.',
  aliases: ['addvid'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) {
      return await sReply(`Nama video tidak valid.\nGunakan nama unik.\nContoh: .addvideo fnbots`);
    }
    const existing = await Media.findOne({ name, type: 'video' });
    if (existing) {
      return await sReply(
        `Gagal! Nama video '${name}' sudah digunakan.\n\n` +
        `Gunakan .editvideo untuk mengupdate atau pilih nama lain.`
      );
    }
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.videoMessage?.mimetype;
    if (!mime) {
      return await sReply(`Harap reply atau kirim video yang ingin disimpan.`);
    }
    const buffer = await fn.getMediaBuffer(targetMsg);
    if (!buffer) {
      return await sReply(`Gagal mengambil video dari pesan.`);
    }
    const tempPath = await tmpDir.createTempFileWithContent(buffer);
    try {
      const saved = await saveMediaStream(name, 'video', mime, tempPath);
      let storageInfo = '';
      if (saved.storageType === 'buffer') {
        storageInfo = '📦 MongoDB (In-Document)';
      } else if (saved.storageType === 'gridfs') {
        storageInfo = '🗄️ GridFS (MongoDB)';
      } else if (saved.storageType === 'local') {
        storageInfo = '💾 Local Filesystem';
      }
      await sReply(
        `Name: ${name}\n` +
        `Storage: ${storageInfo}\n` +
        `Size: ${(saved.size / 1024 / 1024).toFixed(2)} MB\n` +
        `Mime: ${saved.mime}\n\n` +
        `Video berhasil disimpan!\n` +
        `Gunakan trigger '${name}' untuk menampilkan video.`
      );
    } catch (err) {
      log(err, true);
      await sReply(`Gagal menyimpan video: ${err.message}`);
    } finally {
      await tmpDir.deleteFile(tempPath);
    }
  },
};