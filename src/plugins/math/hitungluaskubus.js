// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungluaskubus',
  displayName: 'hitung-luaskubus',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-luaskubus'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi kubus, contoh: ${dbSettings.sname}hitung-luaskubus 5`);
    const res = args[0]
    const ruang = bdr.ruang.kubus('luas', res, false)
    const kubus = bdr.ruang.kubus('luas', res, true)
    await sReply(`*Hasil*: ${ruang}\n${kubus}`);
  }
};