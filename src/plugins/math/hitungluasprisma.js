// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungluasprisma',
  displayName: 'hitung-luasprisma',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-luasprisma'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang alas, tinggi, dan sisi prisma segitiga, contoh: ${dbSettings.sname}hitung-luasprisma 5 10 7 3 4 6`);
    const a = args[0];
    const b = args[1];
    const c = args[2];
    const d = args[3];
    const e = args[4];
    const f = args[5];
    const prisma = bdr.ruang.prisma.luasPermukaan.segitiga(a, b, c, d, e, f, false);
    const luasPermukaan = bdr.ruang.prisma.luasPermukaan.segitiga(a, b, c, d, e, f, true);
    await sReply(`*Hasil*: ${prisma}\n${luasPermukaan}`);
  }
};