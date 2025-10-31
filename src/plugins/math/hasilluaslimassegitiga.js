// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hasilluaslimassegitiga',
  displayName: 'hasil-luaslimassegitiga',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hasil-luaslimassegitiga'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan panjang sisi segitiga, contoh: ${dbSettings.sname}hasil-luaslimassegitiga 5`);
    const res = args[0];
    const ret = args[1];
    const rets = args[2];
    const limas = bdr.ruang.limas.segitiga.luasPermukaan(res, ret, rets, false);
    const segitiga = bdr.ruang.limas.segitiga.luasPermukaan(res, ret, rets, true);
    await sReply(`*Hasil*: ${limas}\n${segitiga}`);
  }
};
