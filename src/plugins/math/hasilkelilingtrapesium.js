// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilkelilingtrapesium',
  displayName: 'hasil-kelilingtrapesium',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-kelilingtrapesium'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi trapesium, contoh: ${dbSettings.sname}hasil-kelilingtrapesium 5 10 7 3`);
    const a = args[0];
    const b = args[1];
    const c = args[2];
    const d = args[3];
    const keliling = bdr.datar.keliling.trapesium(a, b, c, d, false);
    const trapesium = bdr.datar.keliling.trapesium(a, b, c, d, true);
    await sReply(`*Hasil*: ${keliling}\n${trapesium}`);
  }
};
