// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilkelilingpersegi',
  displayName: 'hasil-kelilingpersegi',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-kelilingpersegi'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi persegi, contoh: ${dbSettings.sname}hasil-kelilingpersegi 5`);
    const res = args[0];
    const keliling = bdr.datar.keliling.persegi(res, false);
    const persegi = bdr.datar.keliling.persegi(res, true);
    await sReply(`*Hasil*: ${keliling}\n${persegi}`);
  }
};