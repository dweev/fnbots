// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import susunkataData from '../../games/susunkata.json' with { type: 'json' };

export const command = {
  name: 'susunkata',
  displayName: 'g-susunkata',
  category: 'statefull',
  description: 'Game Statefull susunkata',
  isLimitGameCommand: true,
  aliases: ['g-susunkata'],
  execute: async ({ toId, sPesan, sReply, susunkata }) => {
    if (toId in susunkata) return await sReply('Masih ada soal belum terjawab di chat ini', susunkata[toId][0]);
    const hasil = randomChoice(susunkataData);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Susun Kata:\n\n${hasil.soal}\nTipe Soal: ${hasil.tipe}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonus)} Saldo`);
    susunkata[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (susunkata[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete susunkata[toId];
        }
      }, 90000)
    ];
  }
};
