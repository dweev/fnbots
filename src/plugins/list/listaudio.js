// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'listaudio',
  category: 'list',
  description: 'Menampilkan semua audio yang tersimpan di database.',
  aliases: ['audiolist'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const page = parseInt(arg) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const audios = await Media.find({ type: 'audio' }).sort({ name: 1 }).skip(skip).limit(limit).lean();
    const totalaudios = await Media.countDocuments({ type: 'audio' });
    const totalPages = Math.ceil(totalaudios / limit);
    if (totalaudios === 0) return await sReply('Tidak ada data audio yang tersimpan di database.');
    if (page > totalPages) return await sReply(`Hanya ada ${totalPages} halaman yang tersedia.`);
    let listText = `*❏ DAFTAR AUDIO ❏*\n\n*Halaman ${page} dari ${totalPages}*\n*Total ${totalaudios} audio*\n`;
    const audioLines = audios.map((audio, i) => `\n*${skip + i + 1}.* \`${audio.name}\``);
    listText += audioLines.join('');
    if (page < totalPages) {
      listText += `\n\nUntuk melihat halaman selanjutnya, ketik \`.listaudio ${page + 1}\``;
    }
    await sReply(listText.trim());
  },
};