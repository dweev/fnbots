// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { PLAYERS, BASE_POSITIONS, generateLudoBoard, startLudoTimeout } from '../../function/index.js';

export const command = {
  name: 'ludo',
  displayName: 'g-ludo',
  category: 'statefull',
  description: 'Game Statefull ludo',
  isLimitGameCommand: true,
  aliases: ['g-ludo'],
  execute: async ({ m, toId, sReply, serial, ludoSessions, args, user }) => {
    if (!m.isGroup) return await sReply("Permainan Ludo hanya bisa dimainkan di grup.");
    if (ludoSessions[toId]) return await sReply("Sudah ada permainan Ludo berjalan. Ketik `stop` untuk berhenti.");
    let botCount = 1;
    if (args[0] === '3p') botCount = 2;
    if (args[0] === '4p') botCount = 3;
    const activePlayers = ['RED', ...PLAYERS.slice(0, botCount)];
    const pawnPositions = {};
    activePlayers.forEach(color => {
      pawnPositions[color] = BASE_POSITIONS[color];
    });
    const newGameState = {
      playerJid: serial,
      players: activePlayers,
      pawnPositions: pawnPositions,
      turn: activePlayers.indexOf('RED'),
      status: 'WAITING_FOR_ROLL',
      timeoutId: null
    };
    ludoSessions[toId] = newGameState;
    const botColors = activePlayers.filter(c => c !== 'RED').join(', ');
    const welcomeMessage = `🎲 *Ludo Cepat (1 Pion) Dimulai!* 🎲\n\n` +
      `Kamu bermain sebagai *Merah*.\n` +
      `Lawan: *${botCount} Bot* (${botColors}).\n` +
      `Semua pion mulai di kandang. Dadu 6 untuk keluar.\n` +
      `Sesi akan berakhir dalam 5 menit jika tidak aktif.\n\n` +
      `Giliran Kamu pertama! Ketik *roll* atau *kocok*.`;
    const initialBoard = await generateLudoBoard(newGameState);
    if (!initialBoard) return await sReply("Gagal membuat papan permainan.");
    await sReply({ image: initialBoard, caption: welcomeMessage, mentions: [serial] });
    startLudoTimeout(toId, ludoSessions);
    await user.addXp();
  }
};