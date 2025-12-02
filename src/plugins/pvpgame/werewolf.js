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
  aliases: ['p-werewolf', 'w'],
  execute: async ({ fn, m, arg, args, dbSettings, toId, sReply, sPesan, werewolfSessions, user, serial, pushname }) => {
    if (!arg) return await sReply(`Format pesan salah, gunakan perintah:\n\n${dbSettings.rname}p-werewolf create (untuk membuat sesi)\n${dbSettings.rname}p-werewolf join (untuk bergabung dalam sesi permainan)\n${dbSettings.rname}p-werewolf start (untuk memulai permainan)\n${dbSettings.rname}p-werewolf stop (untuk menghentikan permainan)\n\nNB: \n1. hanya host yang bisa mengentikan permainan untuk mencegah anomali yang suka rusuh...\n2. minimal pemain berjumlah 4 orang.`);
    const command = args[0]?.toLowerCase();
    if (['kill', 'see', 'protect', 'check'].includes(command)) {
      if (m.isGroup) return await sReply('Aksi malam hanya bisa dilakukan di pesan pribadi!');
      const targetNumber = parseInt(args[1]);
      if (!targetNumber) return await sReply(`Format salah! Gunakan: .w ${command} <nomor>\nContoh: .w ${command} 1`);
      let gameState = null;
      for (const [, session] of Object.entries(werewolfSessions)) {
        if (session.pemain && session.pemain[serial]) {
          gameState = session;
          break;
        }
      }
      if (!gameState) return await sReply('Kamu tidak sedang bermain Werewolf.');
      if (gameState.status !== 'NIGHT') return await sReply('Aksi ini hanya bisa dilakukan saat fase malam!');
      const player = gameState.pemain[serial];
      if (!player.isAlive) return await sReply('Kamu sudah mati, tidak bisa melakukan aksi.');
      const livingPlayers = Object.values(gameState.pemain).filter((p) => p.isAlive);
      if (targetNumber < 1 || targetNumber > livingPlayers.length) return await sReply(`Nomor target tidak valid! Pilih antara 1-${livingPlayers.length}`);
      const targetPlayer = livingPlayers[targetNumber - 1];
      const targetJid = targetPlayer.id;
      switch (command) {
        case 'kill':
          if (player.role !== 'werewolf') return await sReply('Hanya Werewolf yang bisa menggunakan perintah ini!');
          if (targetPlayer.role === 'werewolf' || targetPlayer.role === 'sorcerer') return await sReply('Kamu tidak bisa membunuh sesama tim!');
          gameState.aksiMalam.pilihanWerewolf = targetJid;
          return await sReply(`✅ Kamu memilih untuk membunuh @${targetJid.split('@')[0]} malam ini.`);
        case 'protect':
          if (player.role !== 'guardian') return await sReply('Hanya Guardian yang bisa menggunakan perintah ini!');
          gameState.aksiMalam.pilihanGuardian = targetJid;
          return await sReply(`✅ Kamu melindungi @${targetJid.split('@')[0]} malam ini.`);
        case 'check':
          if (player.role !== 'sorcerer') return await sReply('Hanya Sorcerer yang bisa menggunakan perintah ini!');
          return await sReply(`🔮 Kamu memeriksa @${targetJid.split('@')[0]}...\nPeran dia adalah: *${targetPlayer.role}*`);
        case 'see': {
          if (player.role !== 'seer') return await sReply('Hanya Seer yang bisa menggunakan perintah ini!');
          const seerResult = ['werewolf', 'sorcerer'].includes(targetPlayer.role) ? 'JAHAT (Werewolf/Sorcerer)' : 'BAIK (Warga/Guardian/Seer)';
          return await sReply(`🔮 Kamu melihat @${targetJid.split('@')[0]}...\nDia adalah pihak ${seerResult}!`);
        }
      }
    }
    if (command === 'vote') {
      if (!m.isGroup) return await sReply('Voting hanya bisa dilakukan di grup!');
      const gameState = werewolfSessions[toId];
      if (!gameState || gameState.status !== 'VOTING') return await sReply('Saat ini bukan waktu voting!');
      const player = gameState.pemain[serial];
      if (!player || !player.isAlive) return await sReply('Kamu tidak bisa vote (mati atau tidak ikut game).');
      const voteNumber = parseInt(args[1]);
      if (!voteNumber) return await sReply('Format salah! Gunakan: .vote <nomor>\nContoh: .vote 1');
      const livingPlayers = Object.values(gameState.pemain).filter((p) => p.isAlive);
      if (voteNumber < 1 || voteNumber > livingPlayers.length) return await sReply(`Nomor tidak valid! Pilih antara 1-${livingPlayers.length}`);
      const votedPlayer = livingPlayers[voteNumber - 1];
      const votedJid = votedPlayer.id;
      if (votedJid === serial) return await sReply('Kamu tidak bisa vote diri sendiri!');
      gameState.votes[serial] = votedJid;
      return await sPesan(`@${serial.split('@')[0]} telah memvote @${votedJid.split('@')[0]}`);
    }
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
          endGame(toId, 'Game dihentikan karena tidak ada aktivitas selama 30 menit.', fn, m, werewolfSessions);
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
      endGame(toId, 'Game dihentikan oleh host.', fn, m, werewolfSessions);
      await user.addXp();
    }
  }
};
