// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilkelilingbelahketupat',
  displayName: 'hasil-kelilingbelahketupat',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-kelilingbelahketupat'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi belah ketupat, contoh: ${dbSettings.sname}hasil-kelilingbelahketupat 5`);
    const res = args[0];
    const keliling = bdr.datar.keliling.belahKetupat(res, false);
    const belahKetupat = bdr.datar.keliling.belahKetupat(res, true);
    await sReply(`*Hasil*: ${keliling}\n${belahKetupat}`);
  }
};
