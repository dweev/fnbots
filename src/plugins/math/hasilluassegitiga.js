// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilluassegitiga',
  displayName: 'hasil-luassegitiga',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-luassegitiga'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan alas dan tinggi segitiga, contoh: ${dbSettings.sname}hasil-luassegitiga 5 10`);
    const res = args[0];
    const ret = args[1];
    const luas = bdr.datar.luas.segitiga(res, ret, false);
    const segitiga = bdr.datar.luas.segitiga(res, ret, true);
    await sReply(`*Hasil*: ${luas}\n${segitiga}`);
  }
};
