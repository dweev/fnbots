// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilkelilinglingkaran',
  displayName: 'hasil-kelilinglingkaran',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-kelilinglingkaran'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan jari-jari lingkaran, contoh: ${dbSettings.sname}hasil-kelilinglingkaran 5`);
    const res = args[0];
    const keliling = bdr.datar.keliling.lingkaran(res, false);
    const lingkaran = bdr.datar.keliling.lingkaran(res, true);
    await sReply(`*Hasil*: ${keliling}\n${lingkaran}`);
  }
};
