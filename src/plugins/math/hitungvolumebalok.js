// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungvolumebalok',
  displayName: 'hitung-volumebalok',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-volumebalok'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang, lebar, dan tinggi balok, contoh: ${dbSettings.sname}hitung-volumebalok 5 10 7`);
    const res = args[0]
    const ret = args[1]
    const rea = args[2]
    const ruang = bdr.ruang.balok('volume', res, ret, rea, false)
    const balok = bdr.ruang.balok('volume', res, ret, rea, true)
    await sReply(`*Hasil*: ${ruang}\n${balok}`);
  }
};