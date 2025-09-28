// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilluaslingkaran',
  displayName: 'hasil-luaslingkaran',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-luaslingkaran'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan jari-jari lingkaran, contoh: ${dbSettings.sname}hasil-luaslingkaran 5`);
    const res = args[0]
    const luas = bdr.datar.luas.lingkaran(res, false)
    const lingkaran = bdr.datar.luas.lingkaran(res, true)
    await sReply(`*Hasil*: ${luas}\n${lingkaran}`);
  }
};