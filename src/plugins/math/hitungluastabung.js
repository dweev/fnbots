// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungluastabung',
  displayName: 'hitung-luastabung',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-luastabung'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan jari-jari dan tinggi tabung, contoh: ${dbSettings.sname}hitung-luastabung 5 10`);
    const res = args[0];
    const ret = args[1];
    const ruang = bdr.ruang.tabung('luas', res, ret, false);
    const tabung = bdr.ruang.tabung('luas', res, ret, true);
    await sReply(`*Hasil*: ${ruang}\n${tabung}`);
  }
};
