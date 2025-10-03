// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { createOthelloBoard, getValidOthelloMoves, PLAYER_BLACK, generateOthelloBoardImage, calculateOthelloScore } from '../../function/index.js';

export const command = {
  name: 'othello',
  displayName: 'g-othello',
  category: 'statefull',
  description: 'Game Statefull othello',
  isLimitGameCommand: true,
  aliases: ['g-othello'],
  execute: async ({ toId, sReply, serial, othelloGame }) => {
    if (othelloGame[toId]) return await sReply("Masih ada sesi Othello yang berjalan. Hentikan dengan mengetik *menyerah*.");
    const playerJid = serial;
    const board = createOthelloBoard();
    const playerValidMoves = getValidOthelloMoves(board, PLAYER_BLACK);
    const gameDuration = 10 * 60 * 1000;
    const timeoutCallback = () => {
      if (othelloGame[toId]) {
        delete othelloGame[toId];
      }
    };
    const timeoutId = setTimeout(timeoutCallback, gameDuration);
    othelloGame[toId] = {
      board: board,
      players: {
        black: playerJid,
        white: 'BOT'
      },
      turn: PLAYER_BLACK,
      validMoves: playerValidMoves,
      timeoutId: timeoutId
    };
    const boardBuffer = await generateOthelloBoardImage(board, playerValidMoves);
    const score = calculateOthelloScore(board);
    let caption = `⚫️ *Game Othello Dimulai!* ⚪️\n\n`;
    caption += `Kamu (Hitam): @${playerJid.split('@')[0]}\n`;
    caption += `Lawan (Putih): Bot\n\n`;
    caption += `Skor: Hitam ${score.black} - ${score.white} Putih\n\n`;
    caption += `Giliran Kamu. Ketik koordinat untuk bergerak (contoh: *f5*).`;
    await sReply({ image: boardBuffer, caption: caption, mentions: [playerJid] });
  }
};