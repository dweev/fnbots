// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import caklontongData from '../../games/caklontong.json' with { type: 'json' };

export const command = {
  name: 'caklontong',
  displayName: 'g-caklontong',
  category: 'statefull',
  description: 'Game Statefull caklontong.',
  isLimitGameCommand: true,
  aliases: ['g-caklontong'],
  execute: async ({ toId, sPesan, sReply, caklontong }) => {
    if (toId in caklontong) return await sReply('Masih ada soal belum terjawab di chat ini', caklontong[toId][0]);
    const hasil = randomChoice(caklontongData);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonusBigInt = BigInt(bonusAmount);
    const msg = await sPesan(`Kuis Caklontong:\n\n${hasil.soal}\nCluenya Adalah: ${hasil.deskripsi}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonusBigInt)} Saldo`);
    caklontong[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonusBigInt
      },
      2,
      setTimeout(async () => {
        if (caklontong[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete caklontong[toId];
        }
      }, 90000)
    ];
  }
};