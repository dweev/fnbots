// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilkelilingjajargenjang',
  displayName: 'hasil-kelilingjajargenjang',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-kelilingjajargenjang'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi dan tinggi jajargenjang, contoh: ${dbSettings.sname}hasil-kelilingjajargenjang 5 10 7 3`);
    const res = args[0]
    const ret = args[1]
    const rea = args[2]
    const rex = args[3]
    const keliling = bdr.datar.keliling.jajarGenjang(res, ret, rea, rex, false)
    const jajarGenjang = bdr.datar.keliling.jajarGenjang(res, ret, rea, rex, true)
    await sReply(`*Hasil*: ${keliling}\n${jajarGenjang}`);
  }
};