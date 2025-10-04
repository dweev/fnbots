// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilluasbelahketupat',
  displayName: 'hasil-luasbelahketupat',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-luasbelahketupat'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi dan diagonal belah ketupat, contoh: ${dbSettings.sname}hasil-luasbelahketupat 5 10`);
    const q = args[0];
    const a = args[1];
    const luas = bdr.datar.luas.belahKetupat(q, a, false);
    const belahKetupat = bdr.datar.luas.belahKetupat(q, a, true);
    await sReply(`*Hasil*: ${luas}\n${belahKetupat}`);
  }
};