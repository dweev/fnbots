// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'rumuskelilingpersegipanjang',
  displayName: 'rumus-kelilingpersegipanjang',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['rumus-kelilingpersegipanjang'],
  execute: async ({ args, dbSettings, sReply }) => {
    if (!args) return await sReply(`Masukkan panjang dan lebar persegi panjang, contoh: ${dbSettings.sname}rumus-kelilingpersegipanjang 5 10`);
    const res = args[0]
    const ret = args[1]
    const keliling = bdr.datar.keliling.persegiPanjang(res, ret, false)
    const persegiPanjang = bdr.datar.keliling.persegiPanjang(res, ret, true)
    await sReply(`*Hasil*: ${keliling}\n${persegiPanjang}`);
  }
};