// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import log from '../../lib/logger.js';
import { tmpDir } from '../../lib/tempManager.js';
import { Media, saveMediaStream, deleteMedia } from '../../../database/index.js';

export const command = {
  name: 'editvideo',
  category: 'vip',
  description: 'Mengganti video di database dengan yang baru.',
  aliases: ['updatevideo'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) {
      return await sReply(`Nama video tidak valid.\n\nGunakan nama unik untuk video.\nContoh: .editvideo fnbots`);
    }
    const existingVideo = await Media.findOne({ name: name, type: 'video' });
    if (!existingVideo) {
      return await sReply(`Video dengan nama '${name}' tidak ditemukan.\nMungkin Anda ingin membuatnya dengan .addvideo?`);
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
      await deleteMedia({ name, type: 'video' });
      const saved = await saveMediaStream(name, 'video', mime, tempPath);
      await sReply(
        `Storage: ${saved.storageType.toUpperCase()}\n` +
        `Size: ${(saved.size / 1024 / 1024).toFixed(2)} MB\n` +
        `Mime: ${saved.mime}\n\n` +
        `Video '${name}' berhasil diperbarui!`
      );
    } catch (err) {
      log(err, true);
      await sReply(`Gagal memperbarui video: ${err.message}`);
    } finally {
      await tmpDir.deleteFile(tempPath);
    }
  },
};
