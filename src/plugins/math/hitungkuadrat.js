// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungkuadrat',
  displayName: 'hitung-kuadrat',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-kuadrat'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan angka yang ingin dihitung kuadratnya, contoh: ${dbSettings.sname}hitung-kuadrat 5`);
    const res = args[0];
    const kuadrat = bdr.rdb.kuadrat(res);
    await sReply(`*Hasil*: ${kuadrat}`);
  }
};