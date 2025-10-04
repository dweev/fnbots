// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tebakkalimat.json' with { type: 'json' };

export const command = {
  name: 'tebakkalimat',
  displayName: 'g-tebakkalimat',
  category: 'statefull',
  description: 'Game Statefull tebakkalimat',
  isLimitGameCommand: true,
  aliases: ['g-tebakkalimat'],
  execute: async ({ sPesan, toId, sReply, tebakkalimat }) => {
    if (toId in tebakkalimat) return await sReply('Masih ada soal belum terjawab di chat ini', tebakkalimat[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Tebak Kalimat:\n\n${hasil.soal}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonus)} Saldo`);
    tebakkalimat[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tebakkalimat[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete tebakkalimat[toId];
        }
      }, 90000)
    ];
  }
};