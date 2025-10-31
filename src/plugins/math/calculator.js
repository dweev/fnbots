// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import * as Math_js from 'mathjs';

export const command = {
  name: 'calculator',
  displayName: 'calc',
  category: 'math',
  description: 'Melakukan perhitungan menggunakan calculator dengan mathjs',
  isCommandWithoutPayment: true,
  aliases: ['calc'],
  execute: async ({ arg, sReply }) => {
    if (!arg) return await sReply(`Masukkan ekspresi matematika yang ingin dihitung.`);
    const expressionToEvaluate = arg.replace(/x/gi, '*').replace(/:/g, '/');
    const result = Math_js.evaluate(expressionToEvaluate);
    if (typeof result !== 'number') {
      return await sReply(`Hasil dari "${arg}" bukan angka!`);
    } else {
      await sReply(`${arg} = ${result}`);
    }
  }
};
