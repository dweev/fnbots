// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungvolumebola',
  displayName: 'hitung-volumebola',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-volumebola'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan jari-jari bola, contoh: ${dbSettings.sname}hitung-volumebola 5`);
    const res = args[0]
    const ruang = bdr.ruang.bola('volume', res, false)
    const bola = bdr.ruang.bola('volume', res, true)
    await sReply(`*Hasil*: ${ruang}\n${bola}`);
  }
};