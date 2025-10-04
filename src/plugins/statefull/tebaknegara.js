// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tebaknegara.json' with { type: 'json' };

export const command = {
  name: 'tebaknegara',
  displayName: 'g-tebaknegara',
  category: 'statefull',
  description: 'Game Statefull tebaknegara',
  isLimitGameCommand: true,
  aliases: ['g-tebaknegara'],
  execute: async ({ sPesan, toId, sReply, tebaknegara }) => {
    if (toId in tebaknegara) return await sReply('Masih ada soal belum terjawab di chat ini', tebaknegara[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Tebak Negara:\n\n${hasil.tempat}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonus)} Saldo`);
    tebaknegara[toId] = [
      msg,
      {
        jawaban: hasil.negara.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tebaknegara[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.negara}`);
          delete tebaknegara[toId];
        }
      }, 90000)
    ];
  }
};