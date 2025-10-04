// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tebaklirik.json' with { type: 'json' };

export const command = {
  name: 'tebaklirik',
  displayName: 'g-tebaklirik',
  category: 'statefull',
  description: 'Game Statefull tebaklirik',
  isLimitGameCommand: true,
  aliases: ['g-tebaklirik'],
  execute: async ({ sPesan, toId, sReply, tebaklirik }) => {
    if (toId in tebaklirik) return await sReply('Masih ada soal belum terjawab di chat ini', tebaklirik[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Tebak Lirik:\n\n${hasil.soal}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonus)} Saldo`);
    tebaklirik[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tebaklirik[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete tebaklirik[toId];
        }
      }, 90000)
    ];
  }
};