// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tebakkimia.json' with { type: 'json' };

export const command = {
  name: 'tebakkimia',
  displayName: 'g-tebakkimia',
  category: 'statefull',
  description: 'Game Statefull tebakkimia',
  isLimitGameCommand: true,
  aliases: ['g-tebakkimia'],
  execute: async ({ sPesan, toId, sReply, tebakkimia }) => {
    if (toId in tebakkimia) return await sReply('Masih ada soal belum terjawab di chat ini', tebakkimia[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Tebak Kimia:\n\n${hasil.unsur}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonus)} Saldo`);
    tebakkimia[toId] = [
      msg,
      {
        jawaban: hasil.lambang.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tebakkimia[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.lambang}`);
          delete tebakkimia[toId];
        }
      }, 90000)
    ];
  }
};
