// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungvolumeprisma',
  displayName: 'hitung-volumeprisma',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-volumeprisma'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang alas, tinggi, dan sisi prisma segitiga, contoh: ${dbSettings.sname}hitung-volumeprisma 5 10 7`);
    const res = args[0];
    const ret = args[1];
    const rets = args[2];
    const volume = bdr.ruang.prisma.volume.segitiga(res, ret, rets, false);
    const segitiga = bdr.ruang.prisma.volume.segitiga(res, ret, rets, true);
    await sReply(`*Hasil*: ${volume}\n\n${segitiga}`);
  }
};