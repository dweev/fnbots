// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { deleteMedia } from '../../../database/index.js';

export const command = {
  name: 'delvideo',
  category: 'vip',
  description: 'Menghapus video dari database berdasarkan nama.',
  aliases: ['deletevideo'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const name = arg.trim().toLowerCase();
    if (!name) {
      // prettier-ignore
      return await sReply(
        'Gagal! Berikan nama video yang ingin dihapus.\n\n' +
        'Contoh: `.delvideo fnbots`'
      );
    }
    try {
      const deletedInfo = await deleteMedia({ name, type: 'video' });
      if (deletedInfo) {
        let storageLabel = '';
        if (deletedInfo.storageType === 'buffer') {
          storageLabel = 'MongoDB (In-Document)';
        } else if (deletedInfo.storageType === 'gridfs') {
          storageLabel = 'GridFS (MongoDB)';
        } else if (deletedInfo.storageType === 'local') {
          storageLabel = 'Local Filesystem';
        }
        // prettier-ignore
        await sReply(
          `Name: ${deletedInfo.name}\n` +
          `Storage: ${storageLabel}\n\n` +
          `Video berhasil dihapus!`
        );
      } else {
        // prettier-ignore
        return await sReply(
          `Video dengan nama '${name}' tidak ditemukan.\n\n` +
          `Gunakan .listvideo untuk melihat video yang tersedia.`
        );
      }
    } catch (err) {
      await sReply(`Gagal menghapus video: ${err.message}`);
    }
  }
};
