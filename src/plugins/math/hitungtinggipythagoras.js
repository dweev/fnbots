// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungtinggipythagoras',
  displayName: 'hitung-tinggipythagoras',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-tinggipythagoras'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi segitiga siku-siku, contoh: ${dbSettings.sname}hitung-tinggipythagoras 5 10`);
    const res = args[0]
    const ret = args[1]
    const rdb = bdr.rdb.pyhtagoras('tinggi', res, ret, false)
    const pyhtagoras = bdr.rdb.pyhtagoras('tinggi', res, ret, true)
    await sReply(`*Hasil*: ${rdb}\n\n${pyhtagoras}`);
  }
};