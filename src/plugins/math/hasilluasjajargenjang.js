// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilluasjajargenjang',
  displayName: 'hasil-luasjajargenjang',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-luasjajargenjang'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan alas dan tinggi jajargenjang, contoh: ${dbSettings.sname}hasil-luasjajargenjang 5 10`);
    const res = args[0]
    const ret = args[1]
    const luas = bdr.datar.luas.jajarGenjang(res, ret, false)
    const jajarGenjang = bdr.datar.luas.jajarGenjang(res, ret, true)
    await sReply(`*Hasil*: ${luas}\n${jajarGenjang}`);
  }
};