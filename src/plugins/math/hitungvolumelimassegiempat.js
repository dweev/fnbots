// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungvolumelimassegiempat',
  displayName: 'hitung-volumelimassegiempat',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-volumelimassegiempat'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi dan tinggi limas segi empat, contoh: ${dbSettings.sname}hitung-volumelimassegiempat 5 10`);
    const res = args[0]
    const ret = args[1]
    const limas = bdr.ruang.limas.segiempat('volume', res, ret, false)
    const segiempat = bdr.ruang.limas.segiempat('volume', res, ret, true)
    await sReply(`*Hasil*: ${limas}\n${segiempat}`);
  }
};