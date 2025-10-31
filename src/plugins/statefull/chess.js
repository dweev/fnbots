// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Chess } from 'chess.js';
import { generateBoardImage } from '../../function/index.js';

export const command = {
  name: 'chess',
  displayName: 'g-chess',
  category: 'statefull',
  description: 'Game Statefull chess',
  isLimitGameCommand: true,
  aliases: ['g-chess'],
  execute: async ({ fn, m, user, toId, sReply, serial, chessGame }) => {
    if (!m.isGroup) return await sReply('Perintah catur hanya bisa digunakan di dalam grup.');
    if (chessGame[toId]) return await sReply('Masih ada sesi game yang berjalan di grup ini. Hentikan dengan mengetik *menyerah*.');
    const gameDuration = 15 * 60 * 1000;
    const timeoutCallback = () => {
      if (chessGame[toId]) {
        delete chessGame[toId];
      }
    };
    const timeoutId = setTimeout(timeoutCallback, gameDuration);
    const playerJid = serial;
    const gameInstance = new Chess();
    chessGame[toId] = {
      mode: 'pve',
      game: gameInstance,
      players: {
        white: playerJid,
        black: 'BOT'
      },
      timeoutId: timeoutId
    };
    const boardBuffer = await generateBoardImage(gameInstance.fen(), 'w');
    let caption = `🤖 *Mode PvE: Kamu Melawan Bot!* 🤖\n\n`;
    caption += `⚪️ Kamu (Putih): @${await fn.getName(serial)}\n`;
    caption += `⚫️ Lawan (Hitam): Bot\n\n`;
    caption += `Giliran Kamu untuk bergerak. Sesi ini akan berakhir otomatis dalam 15 menit.\n`;
    caption += `Ketik gerakan Kamu langsung di chat.\n`;
    caption += `Format: <dari> <ke> (Contoh: e2 e4)`;
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', boardBuffer, caption, m);
    await user.addXp();
  }
};
