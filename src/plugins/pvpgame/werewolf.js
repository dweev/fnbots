// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { endGame, initializeGameWW } from '../../function/index.js';

export const command = {
  name: 'werewolf',
  displayName: 'p-werewolf',
  category: 'pvpgame',
  description: 'Game Statefull PVP Werewolf',
  isLimitGameCommand: true,
  aliases: ['p-werewolf'],
  execute: async ({ fn, m, arg, args, dbSettings, toId, sReply, sPesan, werewolfSessions, user, serial, pushname }) => {
    if (!arg) return await sReply(`Format pesan salah, gunakan perintah:\n\n${dbSettings.rname}p-werewolf create (untuk membuat sesi)\n${dbSettings.rname}p-werewolf join (untuk bergabung dalam sesi permainan)\n${dbSettings.rname}p-werewolf start (untuk memulai permainan)\n${dbSettings.rname}p-werewolf stop (untuk menghentikan permainan)\n\nNB: \n1. hanya host yang bisa mengentikan permainan untuk mencegah anomali yang suka rusuh...\n2. minimal pemain berjumlah 4 orang.`);
    const command = args[0]?.toLowerCase();
    if (!m.isGroup) return await sReply('Game Werewolf hanya bisa dimainkan di dalam grup.');
    if (command === 'create') {
      if (werewolfSessions[toId]) return await sReply('Sesi Werewolf sudah ada di grup ini.');
      werewolfSessions[toId] = {
        status: 'LOBBY',
        host: serial,
        pemain: {},
        day: 0,
        timeoutId: null
      };
      const lobbyTimeout = setTimeout(
        async () => {
          if (werewolfSessions[toId] && werewolfSessions[toId].status === 'LOBBY') {
            await sPesan('Lobby Werewolf ditutup karena tidak ada aktivitas.');
            delete werewolfSessions[toId];
          }
        },
        15 * 60 * 1000
      );
      werewolfSessions[toId].timeoutId = lobbyTimeout;
      await sPesan('🐺 Lobby Werewolf telah dibuat! Ketik `.p-werewolf join` untuk bergabung. Host bisa memulai dengan `.p-werewolf start`');
      await user.addXp();
    } else if (command === 'join') {
      const gameState = werewolfSessions[toId];
      if (!gameState || gameState.status !== 'LOBBY') return await sReply('Tidak ada lobby Werewolf yang aktif.');
      if (gameState.pemain[serial]) return await sReply('Kamu sudah bergabung.');
      gameState.pemain[serial] = { id: serial, nama: pushname, isAlive: true, role: null };
      await sPesan(`@${serial.split('@')[0]} telah bergabung! Total pemain: ${Object.keys(gameState.pemain).length}`);
      await user.addXp();
    } else if (command === 'start') {
      const gameState = werewolfSessions[toId];
      if (!gameState || gameState.status !== 'LOBBY') return await sReply('Tidak ada lobby Werewolf yang aktif.');
      if (gameState.host !== serial) return await sReply('Hanya host yang bisa memulai game.');
      if (Object.keys(gameState.pemain).length < 4) return await sReply('Pemain minimal 4 orang untuk memulai.');
      clearTimeout(gameState.timeoutId);
      const gameTimeout = setTimeout(
        () => {
          endGame(toId, 'Game dihentikan karena tidak ada aktivitas selama 30 menit.', fn, m);
        },
        30 * 60 * 1000
      );
      gameState.timeoutId = gameTimeout;
      initializeGameWW(toId, fn, m, werewolfSessions);
      await user.addXp();
    } else if (command === 'stop') {
      const gameState = werewolfSessions[toId];
      if (!gameState) return await sReply('Tidak ada game yang sedang berlangsung.');
      if (gameState.host !== serial) return await sReply('Hanya host yang bisa menghentikan game.');
      endGame(toId, 'Game dihentikan oleh host.', fn, m);
      await user.addXp();
    }
  }
};
