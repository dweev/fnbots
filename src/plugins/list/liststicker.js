// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'liststicker',
  category: 'list',
  description: 'Menampilkan semua stiker yang tersimpan di database.',
  aliases: ['stickerlist'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const page = parseInt(arg) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const stickers = await Media.find({ type: 'sticker' }).sort({ name: 1 }).skip(skip).limit(limit).lean();
    const totalStickers = await Media.countDocuments({ type: 'sticker' });
    const totalPages = Math.ceil(totalStickers / limit);
    if (totalStickers === 0) return await sReply('Tidak ada data stiker yang tersimpan di database.');
    if (page > totalPages) return await sReply(`Hanya ada ${totalPages} halaman yang tersedia.`);
    let listText = `*❏ DAFTAR STIKER ❏*\n\n*Halaman ${page} dari ${totalPages}*\n*Total ${totalStickers} stiker*\n`;
    const stickerLines = stickers.map((sticker, i) => `\n*${skip + i + 1}.* \`${sticker.name}\``);
    listText += stickerLines.join('');
    if (page < totalPages) {
      listText += `\n\nUntuk melihat halaman selanjutnya, ketik \`.liststicker ${page + 1}\``;
    }
    await sReply(listText.trim());
  }
};
