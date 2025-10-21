// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { createDeck, shuffleDeck, formatKartu, calculateSamgongValue } from '../../function/index.js';

export const command = {
  name: 'samgong',
  displayName: 'g-samgong',
  category: 'statefull',
  description: 'Game Statefull samgong',
  isLimitGameCommand: true,
  aliases: ['g-samgong'],
  execute: async ({ fn, m, user, toId, sReply, serial, samgongSessions, sPesan }) => {
    if (!m.isGroup) return await sReply('Permainan Samgong hanya bisa dimulai di dalam grup.');
    if (samgongSessions[toId]) return await sReply('Sesi Samgong sudah berjalan di grup ini.');
    const startTimeout = (idGroup) => {
      const gameDuration = 5 * 60 * 1000;
      const timeoutCallback = () => {
        if (samgongSessions[idGroup]) {
          delete samgongSessions[idGroup];
        }
      };
      samgongSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
    };
    const deck = createDeck();
    shuffleDeck(deck);
    const playerHand = deck.splice(0, 2);
    const botHand = deck.splice(0, 2);
    const playerId = serial;
    samgongSessions[toId] = { playerJid: playerId, deck, playerHand, botHand, status: 'player_turn', timeoutId: null };
    startTimeout(toId);
    const groupMessage = `Permainan Samgong (Gaya Hit/Stand) dimulai oleh @${playerId.split('@')[0]}!\n\n` +
      `Satu kartu Bandar terbuka: [ ${botHand[0].display} ]\n\n` +
      `Giliranmu, @${playerId.split('@')[0]}! Cek DM. Sesi akan berakhir dalam 5 menit jika tidak aktif.`;
    await sPesan(groupMessage);
    const privateMessage = `Ini kartumu (Total: *${calculateSamgongValue(playerHand)}*):\n${formatKartu(playerHand)}\n\n` +
      `Ketik *hit* untuk menambah kartu, atau *stand* untuk berhenti.`;
    const expiration = await fn.getEphemeralExpiration(playerId);
    await fn.sendPesan(playerId, privateMessage, { ephemeralExpiration: expiration });
    await user.addXp();
  }
};