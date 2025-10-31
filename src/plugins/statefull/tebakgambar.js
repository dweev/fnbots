// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soal from '../../games/tebakgambar.json' with { type: 'json' };

export const command = {
  name: 'tebakgambar',
  displayName: 'g-tebakgambar',
  category: 'statefull',
  description: 'Game Statefull tebakgambar',
  isLimitGameCommand: true,
  aliases: ['g-tebakgambar'],
  execute: async ({ fn, m, toId, sReply, tebakgambar }) => {
    if (toId in tebakgambar) return await sReply('Masih ada soal belum terjawab di chat ini', tebakgambar[toId][0]);
    const hasil = randomChoice(soal);
    const bonusAmount = Math.floor(Math.random() * 491) + 10;
    const bonus = BigInt(bonusAmount);
    const msg = await fn.sendFileUrl(toId, hasil.img, `Tebak Gambar Berikut:\n\n${hasil.deskripsi}\n\nWaktu : 60s\nHadiah ${formatNumber(bonus)}`, m);
    tebakgambar[toId] = [
      msg,
      {
        jawaban: hasil.jawaban.toLowerCase(),
        bonus: bonus
      },
      2,
      setTimeout(async () => {
        if (tebakgambar[toId]) {
          await sReply(`Waktu habis!\nJawaban: ${hasil.jawaban}`);
          delete tebakgambar[toId];
        }
      }, 90000)
    ];
  }
};
