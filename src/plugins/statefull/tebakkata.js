// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tebakkata.json' with { type: 'json' };

export const command = {
  name: 'tebakkata',
  displayName: 'g-tebakkata',
  category: 'statefull',
  description: 'Game Statefull tebakkata',
  isLimitGameCommand: true,
  aliases: ['g-tebakkata'],
  execute: async ({ sPesan, toId, sReply, tebakkata }) => {
    if (toId in tebakkata) return await sReply('Masih ada soal belum terjawab di chat ini', tebakkata[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Tebak Kata:\n\n${hasil.soal}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonus)} Saldo`);
    tebakkata[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tebakkata[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete tebakkata[toId];
        }
      }, 90000)
    ];
  }
};
