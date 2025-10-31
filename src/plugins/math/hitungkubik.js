// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import bdr from 'rumus-bdr';

export const command = {
  name: 'hitungkubik',
  displayName: 'hitung-kubik',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['hitung-kubik'],
  execute: async ({ arg, args, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Masukkan angka yang ingin dihitung kubiknya, contoh: ${dbSettings.sname}hitung-kubik 5`);
    const res = args[0];
    const kubik = bdr.rdb.kubik(res);
    await sReply(`*Hasil*: ${kubik}`);
  }
};
