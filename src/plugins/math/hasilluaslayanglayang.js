// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilluaslayanglayang',
  displayName: 'hasil-luaslayanglayang',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-luaslayanglayang'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang diagonal 1 dan diagonal 2 layang-layang, contoh: ${dbSettings.sname}hasil-luaslayanglayang 5 10`);
    const res = args[0]
    const ret = args[1]
    const luas = bdr.datar.luas.layang(res, ret, false)
    const layang = bdr.datar.luas.layang(res, ret, true)
    await sReply(`*Hasil*: ${luas}\n${layang}`);
  }
};