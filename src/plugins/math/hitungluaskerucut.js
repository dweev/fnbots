// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungluaskerucut',
  displayName: 'hitung-luaskerucut',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-luaskerucut'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan jari-jari dan tinggi kerucut, contoh: ${dbSettings.sname}hitung-luaskerucut 5 10`);
    const res = args[0];
    const ret = args[1];
    const ruang = bdr.ruang.kerucut('luas', res, ret, false);
    const kerucut = bdr.ruang.kerucut('luas', res, ret, true);
    await sReply(`*Hasil*: ${ruang}\n${kerucut}`);
  }
};
