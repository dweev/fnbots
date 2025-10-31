// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tebakbendera.json' with { type: 'json' };

export const command = {
  name: 'tebakbendera',
  displayName: 'g-tebakbendera',
  category: 'statefull',
  description: 'Game Statefull tebakbendera',
  isLimitGameCommand: true,
  aliases: ['g-tebakbendera'],
  execute: async ({ toId, sPesan, sReply, tebakbendera }) => {
    if (toId in tebakbendera) return await sReply('Masih ada soal belum terjawab di chat ini', tebakbendera[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Tebak Bendera:\n\n${hasil.bendera}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonus)} Saldo`);
    tebakbendera[toId] = [
      msg,
      {
        jawaban: hasil.negara.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tebakbendera[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.negara}`);
          delete tebakbendera[toId];
        }
      }, 90000)
    ];
  }
};
