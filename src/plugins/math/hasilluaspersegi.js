// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilluaspersegi',
  displayName: 'hasil-luaspersegi',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-luaspersegi'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi persegi, contoh: ${dbSettings.sname}hasil-luaspersegi 5`);
    const q = args[0];
    const luas = bdr.datar.luas.persegi(q, false);
    const persegi = bdr.datar.luas.persegi(q, true);
    await sReply(`*Hasil*: ${luas}\n${persegi}`);
  }
};