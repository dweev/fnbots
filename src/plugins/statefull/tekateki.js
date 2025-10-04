// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tekateki.json' with { type: 'json' };

export const command = {
  name: 'tekateki',
  displayName: 'g-tekateki',
  category: 'statefull',
  description: 'Game Statefull tekateki',
  isLimitGameCommand: true,
  aliases: ['g-tekateki'],
  execute: async ({ sPesan, toId, sReply, tekateki }) => {
    if (toId in tekateki) return await sReply('Masih ada soal belum terjawab di chat ini', tekateki[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Teka Teki:\n\n${hasil.soal}\n\nTimeout: 90 detik\nHadiah: +${formatNumber(bonus)} Saldo`);
    tekateki[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tekateki[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete tekateki[toId];
        }
      }, 90000)
    ];
  }
};