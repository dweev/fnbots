// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice, formatNumber } from '../../function/index.js';
import soalData from '../../games/hangman.json' with { type: 'json' };

export const command = {
  name: 'hangman',
  displayName: 'p-hangman',
  category: 'pvpgame',
  description: 'Game Statefull PVP Hangman',
  isLimitGameCommand: true,
  aliases: ['p-hangman'],
  execute: async ({ arg, args, dbSettings, toId, sReply, sPesan, hangman, user }) => {
    if (!arg) return await sReply(`Gunakan perintah: ${dbSettings.rname}p-hangman <normal|expert>`);
    const mode = args[0]?.toLowerCase();
    if (!['normal', 'expert'].includes(mode)) return await sReply('Gunakan perintah: p-hangman <normal|expert>');
    if (hangman[toId]) return await sReply('Masih ada sesi Hangman yang belum selesai.');
    const kategori = randomChoice(Object.keys(soalData));
    const soal = randomChoice(soalData[kategori]);
    const hiddenWord = soal.jawaban.toLowerCase();
    const display = hiddenWord.replace(/[a-z]/gi, (huruf) => (huruf === ' ' ? ' ' : '•'));
    const benar = {};
    const salah = {};
    const reward = mode === 'normal' ? 500n : 2000n;
    const duration = mode === 'normal' ? 5 * 60 * 1000 : 3 * 60 * 1000;
    const timeout = setTimeout(async () => {
      const [, , , , modeNow, , soalAkhir] = hangman[toId];
      let teks = `⏰ *Waktu habis!*\n`;
      teks += `🧩 Jawaban: *${soalAkhir.jawaban.toUpperCase()}*\n📖 Deskripsi: ${soalAkhir.deskripsi}\n\n`;
      teks += modeNow === 'normal' ? '💸 Tidak ada reward karena tidak diselesaikan.' : '📉 Tidak ada reward karena game tidak diselesaikan.';
      delete hangman[toId];
      await sPesan(teks);
    }, duration);
    hangman[toId] = [
      hiddenWord,
      display.split(''),
      kategori,
      {
        benar,
        salah,
        menyerah: {}
      },
      mode,
      timeout,
      soal
    ];
    await user.addXp();
    // prettier-ignore
    await sPesan(
      '🎮 *Hangman - ' + mode.toUpperCase() + ' MODE*\n' +
      '📌 Clue: ' + kategori + '\n' +
      '🧩 Kata: ' + display + '\n' +
      '💰 Reward: ' + formatNumber(reward) + ' Saldo\n' +
      '⏳ Waktu: ' + (duration / 60000) + ' menit\n\n' +
      'Ketik satu huruf untuk mulai menebak.'
    );
  }
};
