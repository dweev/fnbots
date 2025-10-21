// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatTicTacToeBoard } from '../../function/index.js';

export const command = {
  name: 'tictactoe',
  displayName: 'g-tictactoe',
  category: 'statefull',
  description: 'Game Statefull tictactoe',
  isLimitGameCommand: true,
  aliases: ['g-tictactoe'],
  execute: async ({ m, user, toId, sReply, serial, tictactoeSessions, sPesan }) => {
    if (!m.isGroup) return await sReply("Permainan ini hanya bisa dimainkan di grup.");
    if (tictactoeSessions[toId]) return await sReply("Sudah ada permainan yang sedang berjalan di grup ini.");
    const startTTTTimeout = (idGroup) => {
      const gameDuration = 3 * 60 * 1000;
      const timeoutCallback = () => {
        if (tictactoeSessions[idGroup]) {
          delete tictactoeSessions[idGroup];
        }
      };
      tictactoeSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
    };
    const initialBoard = [['', '', ''], ['', '', ''], ['', '', '']];
    const playerJid = serial;
    tictactoeSessions[toId] = {
      board: initialBoard,
      playerJid: playerJid,
      playerSymbol: 'X',
      botSymbol: 'O',
      turn: 'player',
      timeoutId: null
    };
    startTTTTimeout(toId);
    let introText = `Permainan Tic-Tac-Toe dimulai antara @${playerJid.split('@')[0]} (X) dan Bot (O)!\n\n` +
      `Kamu mendapat giliran pertama. Sesi akan berakhir dalam 3 menit jika tidak aktif.\n` +
      `Ketik angka (1-9) untuk menempatkan 'X' Kamu.\n`;
    introText += formatTicTacToeBoard(initialBoard);
    await sPesan(introText);
    await user.addXp();
  }
};