// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungluasbola',
  displayName: 'hitung-luasbola',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-luasbola'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan jari-jari bola, contoh: ${dbSettings.sname}hitung-luasbola 5`);
    const res = args[0];
    const ruang = bdr.ruang.bola('luas', res, false);
    const bola = bdr.ruang.bola('luas', res, true);
    await sReply(`*Hasil*: ${ruang}\n${bola}`);
  }
};