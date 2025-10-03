// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tebakgame.json' with { type: 'json' };

export const command = {
  name: 'tebakgame',
  displayName: 'g-tebakgame',
  category: 'statefull',
  description: 'Game Statefull tebakgame',
  isLimitGameCommand: true,
  aliases: ['g-tebakgame'],
  execute: async ({ fn, m, toId, sReply, tebakgame }) => {
    if (toId in tebakgame) return await sReply('Masih ada soal belum terjawab di chat ini', tebakgame[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await fn.sendFileUrl(toId, hasil.img, `Tebak Game Berikut:\n\nWaktu : 60s\nHadiah ${formatNumber(bonus)}`, m);
    tebakgame[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tebakgame[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete tebakgame[toId];
        }
      }, 90000)
    ];
  }
};