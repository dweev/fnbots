// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilluastrapesium',
  displayName: 'hasil-luastrapesium',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-luastrapesium'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi trapesium, contoh: ${dbSettings.sname}hasil-luastrapesium 5 10 7`);
    const a = args[0];
    const b = args[1];
    const c = args[2];
    const luas = bdr.datar.luas.trapesium(a, b, c, false);
    const trapesium = bdr.datar.luas.trapesium(a, b, c, true);
    await sReply(`*Hasil*: ${luas}\n${trapesium}`);
  }
};
