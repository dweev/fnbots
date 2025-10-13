// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { createDeck, shuffleDeck, formatKartu } from '../../function/index.js';

export const command = {
  name: '41',
  displayName: 'g-41',
  category: 'statefull',
  description: 'Game Statefull 41',
  isLimitGameCommand: true,
  aliases: ['g-41'],
  execute: async ({ fn, m, user, toId, sReply, serial, game41Sessions }) => {
    if (!m.isGroup) return await sReply('Permainan 41 hanya bisa dimulai di dalam grup.');
    if (game41Sessions[toId]) return await sReply('Sudah ada permainan kartu 41 yang sedang berjalan di grup ini.');
    const gameDuration = 10 * 60 * 1000;
    const timeoutCallback = () => {
      if (game41Sessions[toId]) {
        delete game41Sessions[toId];
      }
    };
    const timeoutId = setTimeout(timeoutCallback, gameDuration);
    const personalities = ['logis', 'pintar', 'licik', 'pintar_licik'];
    const chosenPersonality = personalities[Math.floor(Math.random() * personalities.length)];
    const deck = createDeck();
    shuffleDeck(deck);
    const playerHand = deck.splice(0, 4);
    const botHand = deck.splice(0, 4);
    const discardPile = deck.splice(0, 1);
    const playerId = serial;
    game41Sessions[toId] = {
      playerJid: playerId, deck, discardPile, playerHand, botHand,
      turn: 'player',
      status: 'playing',
      personality: chosenPersonality,
      timeoutId: timeoutId
    };
    const groupMessage = `Permainan Kartu 41 (4 Kartu) melawan Bot dimulai oleh @${playerId.split('@')[0]}!\n\n` +
      `Kepribadian Bot: *${chosenPersonality.replace('_', ' & ')}*\n` +
      `Kartu buangan pertama adalah [ ${discardPile[0].display} ].\n` +
      `Sesi ini akan berakhir dalam 10 menit.\n\n` +
      `Giliranmu! Kartu sudah saya kirim via DM.`;
    await fn.sendPesan(toId, groupMessage, { ephemeralExpiration: m.expiration ?? 0 });
    const privateMessage = `Ini kartumu untuk game di grup:\n\n${formatKartu(playerHand)}\n\n` +
      `Pilih aksimu di grup: *ambil dek* atau *ambil buangan*.`;
    const expiration = await fn.getEphemeralExpiration(playerId);
    await fn.sendPesan(playerId, privateMessage, { ephemeralExpiration: expiration });
    await user.addXp();
  }
};