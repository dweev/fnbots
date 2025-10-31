// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilkelilinglayanglayang',
  displayName: 'hasil-kelilinglayanglayang',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-kelilinglayanglayang'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang diagonal 1 dan diagonal 2 layang-layang, contoh: ${dbSettings.sname}hasil-kelilinglayanglayang 5 10`);
    const res = args[0];
    const ret = args[1];
    const keliling = bdr.datar.keliling.layang(res, ret, false);
    const layang = bdr.datar.keliling.layang(res, ret, true);
    await sReply(`*Hasil*: ${keliling}\n${layang}`);
  }
};
