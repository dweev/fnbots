// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import siapakahAkuData from '../../games/siapakahaku.json' with { type: 'json' };

export const command = {
  name: 'siapaaku',
  displayName: 'g-siapaaku',
  category: 'statefull',
  description: 'Game Statefull siapakah aku?',
  isLimitGameCommand: true,
  aliases: ['g-siapaaku'],
  execute: async ({ toId, sPesan, sReply, siapakahaku }) => {
    if (toId in siapakahaku) return await sReply('Masih ada soal belum terjawab di chat ini', siapakahaku[toId][0]);
    const hasil = randomChoice(siapakahAkuData);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await sPesan(`Siapakah Aku:\n\n${hasil.soal}\n\nTimeout: 90 detik\nPoint Jawaban Benar: +${formatNumber(bonus)} Saldo`);
    siapakahaku[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (siapakahaku[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete siapakahaku[toId];
        }
      }, 90000)
    ];
  }
};
