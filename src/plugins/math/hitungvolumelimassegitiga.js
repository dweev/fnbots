// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungvolumelimassegitiga',
  displayName: 'hitung-volumelimassegitiga',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-volumelimassegitiga'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi limas segitiga, contoh: ${dbSettings.sname}hitung-volumelimassegitiga 5 10 7`);
    const res = args[0];
    const ret = args[1];
    const rets = args[2];
    const limas = bdr.ruang.limas.segitiga.volume(res, ret, rets, false);
    const segitiga = bdr.ruang.limas.segitiga.volume(res, ret, rets, true);
    await sReply(`*Hasil*: ${limas}\n${segitiga}`);
  }
};
