// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungalaspythagoras',
  displayName: 'hitung-alaspythagoras',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-alaspythagoras'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi segitiga siku-siku, contoh: ${dbSettings.sname}hitung-alaspythagoras 5 10`);
    const res = args[0];
    const ret = args[1];
    const rdb = bdr.rdb.pyhtagoras('alas', res, ret, false);
    const pyhtagoras = bdr.rdb.pyhtagoras('alas', res, ret, true);
    await sReply(`*Hasil*: ${rdb}\n${pyhtagoras}`);
  }
};