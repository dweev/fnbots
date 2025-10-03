// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'listimage',
  category: 'list',
  description: 'Menampilkan semua gambar yang tersimpan di database.',
  aliases: ['imagelist'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const page = parseInt(arg) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const images = await Media.find({ type: 'image' }).sort({ name: 1 }).skip(skip).limit(limit).lean();
    const totalImages = await Media.countDocuments({ type: 'image' });
    const totalPages = Math.ceil(totalImages / limit);
    if (totalImages === 0) return await sReply('Tidak ada data gambar yang tersimpan di database.');
    if (page > totalPages) return await sReply(`Hanya ada ${totalPages} halaman yang tersedia.`);
    let listText = `*❏ DAFTAR GAMBAR ❏*\n\n*Halaman ${page} dari ${totalPages}*\n*Total ${totalImages} gambar*\n`;
    const imageLines = images.map((image, i) => `\n*${skip + i + 1}.* \`${image.name}\``);
    listText += imageLines.join('');
    if (page < totalPages) {
      listText += `\n\nUntuk melihat halaman selanjutnya, ketik \`.listimage ${page + 1}\``;
    }
    await sReply(listText.trim());
  },
};