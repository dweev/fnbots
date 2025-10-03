// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungluasbalok',
  displayName: 'hitung-luasbalok',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-luasbalok'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang, lebar, dan tinggi balok, contoh: ${dbSettings.sname}hitung-luasbalok 5 10 7`);
    const res = args[0];
    const ret = args[1];
    const rea = args[2];
    const ruang = bdr.ruang.balok('luas', res, ret, rea, false);
    const balok = bdr.ruang.balok('luas', res, ret, rea, true);
    await sReply(`*Hasil*: ${ruang}\n${balok}`);
  }
};