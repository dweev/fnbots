// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import sudoku from 'sudoku';
import { generateSudokuBoardImage } from '../../function/index.js';

export const command = {
  name: 'sudoku',
  displayName: 'g-sudoku',
  category: 'statefull',
  description: 'Game Statefull sudoku',
  isLimitGameCommand: true,
  aliases: ['g-sudoku'],
  execute: async ({ toId, sReply, serial, sudokuGame, args }) => {
    if (sudokuGame[toId]) return await sReply("Masih ada sesi Sudoku yang berjalan. Hentikan dengan mengetik *menyerah*.");
    const difficultyArg = args[0] ? args[0].toLowerCase() : 'easy';
    const difficultyMap = {
      easy: 45,
      normal: 38,
      hard: 31,
      extreme: 24
    };
    const cellsToKeep = difficultyMap[difficultyArg] || difficultyMap['easy'];
    const difficultyName = Object.keys(difficultyMap).find(key => difficultyMap[key] === cellsToKeep);
    const base_puzzle = sudoku.makepuzzle();
    const solution = sudoku.solvepuzzle(base_puzzle);
    const puzzle = [...solution];
    const indices = Array.from(Array(81).keys()).sort(() => Math.random() - 0.5);
    const cellsToRemove = 81 - cellsToKeep;
    for (let i = 0; i < cellsToRemove; i++) {
      puzzle[indices[i]] = null;
    }
    const playerBoard = [...puzzle];
    const gameDuration = 5 * 60 * 1000;
    const timeoutCallback = () => {
      if (sudokuGame[toId]) {
        delete sudokuGame[toId];
      }
    };
    const timeoutId = setTimeout(timeoutCallback, gameDuration);
    sudokuGame[toId] = {
      puzzle,
      solution,
      board: playerBoard,
      player: serial,
      timeoutId: timeoutId,
      hintsUsed: 0
    };
    const boardBuffer = await generateSudokuBoardImage(puzzle, playerBoard);
    let caption = `🧩 *Game Sudoku Dimulai!* 🧩\n\n`;
    caption += `Level: *${difficultyName.charAt(0).toUpperCase() + difficultyName.slice(1)}*\n\n`;
    caption += `Isi kotak yang kosong dengan angka 1-9.\n\n`;
    caption += `➡️ *a1 5* untuk mengisi angka.\n`;
    caption += `➡️ *a1 0* untuk menghapus angka.\n`;
    caption += `➡️ *hint* untuk bantuan jawaban.\n`;
    caption += `➡️ *cek* untuk memeriksa jawabanmu.\n`;
    caption += `➡️ *menyerah* untuk mengakhiri game.`;
    await sReply({ image: boardBuffer, caption: caption });
  }
};