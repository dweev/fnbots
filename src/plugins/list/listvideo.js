// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'listvideo',
  category: 'list',
  description: 'Menampilkan semua video yang tersimpan di database.',
  aliases: ['videolist'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const page = parseInt(arg) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const videos = await Media.find({ type: 'video' }).sort({ name: 1 }).skip(skip).limit(limit).lean();
    const totalvideos = await Media.countDocuments({ type: 'video' });
    const totalPages = Math.ceil(totalvideos / limit);
    if (totalvideos === 0) return await sReply('Tidak ada data video yang tersimpan di database.');
    if (page > totalPages) return await sReply(`Hanya ada ${totalPages} halaman yang tersedia.`);
    let listText = `*❏ DAFTAR VIDEO ❏*\n\n*Halaman ${page} dari ${totalPages}*\n*Total ${totalvideos} video*\n`;
    const videoLines = videos.map((video, i) => `\n*${skip + i + 1}.* \`${video.name}\``);
    listText += videoLines.join('');
    if (page < totalPages) {
      listText += `\n\nUntuk melihat halaman selanjutnya, ketik \`.listvideo ${page + 1}\``;
    }
    await sReply(listText.trim());
  },
};