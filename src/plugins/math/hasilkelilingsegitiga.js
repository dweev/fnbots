// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilkelilingsegitiga',
  displayName: 'hasil-kelilingsegitiga',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-kelilingsegitiga'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi segitiga, contoh: ${dbSettings.sname}hasil-kelilingsegitiga 5 10 7`);
    const res = args[0];
    const ret = args[1];
    const rea = args[2];
    const keliling = bdr.datar.keliling.segitiga(res, ret, rea, false);
    const segitiga = bdr.datar.keliling.segitiga(res, ret, rea, true);
    await sReply(`*Hasil*: ${keliling}\n${segitiga}`);
  }
};
