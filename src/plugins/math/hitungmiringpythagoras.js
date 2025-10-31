// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungmiringpythagoras',
  displayName: 'hitung-miringpythagoras',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-miringpythagoras'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi segitiga siku-siku, contoh: ${dbSettings.sname}hitung-miringpythagoras 5 10`);
    const res = args[0];
    const ret = args[1];
    const rdb = bdr.rdb.pyhtagoras('miring', res, ret, false);
    const pyhtagoras = bdr.rdb.pyhtagoras('miring', res, ret, true);
    await sReply(`*Hasil*: ${rdb}\n${pyhtagoras}`);
  }
};
