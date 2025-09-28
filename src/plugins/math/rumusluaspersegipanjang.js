// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'rumusluaspersegipanjang',
  displayName: 'rumus-luaspersegipanjang',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['rumus-luaspersegipanjang'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang dan lebar persegi panjang, contoh: ${dbSettings.sname}rumus-luaspersegipanjang 5 10`);
    const res = args[0]
    const ret = args[1]
    const luas = bdr.datar.luas.persegiPanjang(res, ret, false)
    const persegiPanjang = bdr.datar.luas.persegiPanjang(res, ret, true)
    await sReply(`*Hasil*: ${luas}\n${persegiPanjang}`);
  }
};