// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { generateMinesweeperBoard, formatMinesweeperBoard } from '../../function/index.js';

export const command = {
  name: 'minesweeper',
  displayName: 'g-minesweeper',
  category: 'statefull',
  description: 'Game Statefull minesweeper',
  isLimitGameCommand: true,
  aliases: ['g-minesweeper'],
  execute: async ({ toId, sReply, serial, minesweeperSessions, args, user }) => {
    if (minesweeperSessions[toId]) return await sReply('Sudah ada game Minesweeper berjalan di grup ini.');
    const level = args[0] || 'mudah';
    const startMinesweeperTimeout = (idGroup) => {
      const gameDuration = 10 * 60 * 1000;
      const timeoutCallback = () => {
        if (minesweeperSessions[idGroup]) {
          delete minesweeperSessions[idGroup];
        }
      };
      minesweeperSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
    };
    let width, height, numMines;
    if (level === 'sedang') {
      width = 12;
      height = 12;
      numMines = 20;
    } else if (level === 'sulit') {
      width = 15;
      height = 15;
      numMines = 40;
    } else {
      width = 9;
      height = 9;
      numMines = 10;
    }
    const solutionBoard = generateMinesweeperBoard(width, height, numMines);
    // prettier-ignore
    const playerBoard = Array(height).fill(null).map(() => Array(width).fill({ status: 'tertutup', value: '' }));
    minesweeperSessions[toId] = {
      playerJid: serial,
      solutionBoard,
      playerBoard,
      gameStatus: 'playing',
      mineCount: numMines,
      timeoutId: null
    };
    startMinesweeperTimeout(toId);
    // prettier-ignore
    let introText = `Game Minesweeper level *${level}* dimulai!\n\n` +
      `Total Bom: ${numMines}\n` +
      `Sesi akan berakhir dalam 10 menit jika tidak aktif.\n\n` +
      `Gunakan perintah:\n` +
      `▫️ *buka <koordinat>* (contoh: buka c5)\n` +
      `▫️ *tandai <koordinat>* (contoh: tandai a1)\n` +
      `▫️ *batal <koordinat>* (contoh: batal a1)`;
    introText += formatMinesweeperBoard(playerBoard);
    await sReply(introText);
    await user.addXp();
  }
};
