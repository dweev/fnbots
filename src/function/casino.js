// ─── Info ────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── info src/function/casino.js ─────────────

import { delay } from '../function/index.js';

export const formatHandSimple = (hand) => hand.map((c) => `[${c.rank}${c.suit}]`).join(' ');
export const getHandDetails = (hand) => {
  const rankToValue = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  const sortedHand = hand.slice().sort((a, b) => rankToValue[a.rank] - rankToValue[b.rank]);
  const values = sortedHand.map((c) => rankToValue[c.rank]);
  const suits = sortedHand.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const isStraight = (values[0] + 1 === values[1] && values[1] + 1 === values[2]) || (values[0] === 2 && values[1] === 3 && values[2] === 14);
  if (isStraight && isFlush) return { rankValue: 6, name: '🐉 DRAGON 🐉 (Straight Flush)' };
  if (values[0] === values[1] && values[1] === values[2]) return { rankValue: 5, name: 'Three of a Kind' };
  if (isStraight) return { rankValue: 4, name: 'Straight' };
  if (isFlush) return { rankValue: 3, name: 'Flush' };
  if (values[0] === values[1] || values[1] === values[2]) return { rankValue: 2, name: 'Pair' };
  const highCardRank = Object.keys(rankToValue).find((key) => rankToValue[key] === values[2]);
  return { rankValue: 1, name: `High Card ${highCardRank}` };
};
export const anteBonusMultipliers = {
  6: 52n,
  5: 10n,
  4: 5n,
  3: 2n,
  2: 1n
};
const specialHandRules = [
  { name: 'Empat As dengan Kartu Kecil', check: isFourAcesWithLow },
  { name: 'Empat As', check: isFourAces },
  { name: 'Pure Samgong', check: isPureSamgong },
  { name: '7 Kartu Kecil', check: isSevenCardLow },
  { name: 'Kartu Kecil', check: isLowCardsOnly }
];

export function createDeck() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
  const deck = [];
  for (let i = 0; i < suits.length; i++) {
    for (let j = 0; j < ranks.length; j++) {
      deck.push({ suit: suits[i], rank: ranks[j], value: values[j], display: `${ranks[j]} ${suits[i]}` });
    }
  }
  return deck;
}
export function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}
export function formatKartu(hand) {
  if (!hand || hand.length === 0) return 'Tangan kosong.';
  return hand.map((card, index) => `${index + 1}. [ ${card.display} ]`).join('\n');
}
export function calculateScore(hand) {
  if (!hand || hand.length === 0) return 0;
  const scoresBySuit = {};
  for (const card of hand) {
    scoresBySuit[card.suit] = (scoresBySuit[card.suit] || 0) + card.value;
  }
  return Object.keys(scoresBySuit).length > 0 ? Math.max(...Object.values(scoresBySuit)) : 0;
}
function isFourAces(hand) {
  const aceCount = hand.filter((card) => card.rank === 'A').length;
  return aceCount >= 4;
}
function isLowCardsOnly(hand) {
  return hand.every((card) => ['2', '3', '4'].includes(card.rank));
}
function isFourAcesWithLow(hand) {
  const aceCount = hand.filter((card) => card.rank === 'A').length;
  const otherCards = hand.filter((card) => card.rank !== 'A');
  return aceCount >= 4 && otherCards.every((card) => ['2', '3', '4'].includes(card.rank));
}
function isSevenCardLow(hand) {
  return hand.length === 7 && isLowCardsOnly(hand);
}
function isPureSamgong(hand) {
  return hand.every((card) => ['K', 'Q', 'J'].includes(card.rank));
}
export function calculateSamgongValue(hand) {
  let totalValue = 0;
  for (const card of hand) {
    if (['K', 'Q', 'J'].includes(card.rank)) {
      totalValue += 10;
    } else if (card.rank === 'A') {
      totalValue += 1;
    } else {
      totalValue += card.value;
    }
  }
  return totalValue;
}
function getSpecialHandName(hand) {
  for (const rule of specialHandRules) {
    if (rule.check(hand)) return rule.name;
  }
  return null;
}
export async function runBotTurn41(toId, m, fn, game41Sessions) {
  const gameState = game41Sessions[toId];
  if (!gameState) return;
  const personality = gameState.personality;
  let takenCard;
  const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
  if (personality === 'logis') {
    const suitCounts = gameState.botHand.reduce((acc, card) => ({ ...acc, [card.suit]: (acc[card.suit] || 0) + 1 }), {});
    const bestSuit = Object.keys(suitCounts).reduce((a, b) => (suitCounts[a] > suitCounts[b] ? a : b), null);
    if (topDiscard && bestSuit && topDiscard.suit === bestSuit) takenCard = gameState.discardPile.pop();
    else takenCard = gameState.deck.shift();
  } else {
    const currentScore = calculateScore(gameState.botHand);
    const potentialScore = calculateScore([...gameState.botHand, topDiscard]);
    if (topDiscard && potentialScore > currentScore) takenCard = gameState.discardPile.pop();
    else takenCard = gameState.deck.shift() || gameState.discardPile.pop();
  }
  gameState.botHand.push(takenCard);
  const suitCounts = gameState.botHand.reduce((acc, card) => ({ ...acc, [card.suit]: (acc[card.suit] || 0) + 1 }), {});
  const mainSuit = Object.keys(suitCounts).reduce((a, b) => (suitCounts[a] > suitCounts[b] ? a : b));
  let cardToDiscardIndex = -1;
  let lowestValue = Infinity;
  gameState.botHand.forEach((card, index) => {
    if (card.suit !== mainSuit) {
      if (card.value < lowestValue) {
        lowestValue = card.value;
        cardToDiscardIndex = index;
      }
    }
  });
  if (cardToDiscardIndex === -1) {
    lowestValue = Infinity;
    gameState.botHand.forEach((card, index) => {
      if (card.value < lowestValue) {
        lowestValue = card.value;
        cardToDiscardIndex = index;
      }
    });
  }
  const discardedCard = gameState.botHand.splice(cardToDiscardIndex, 1)[0];
  gameState.discardPile.push(discardedCard);
  const botFinalScore = calculateScore(gameState.botHand);
  let knockThreshold = 42;
  if (personality === 'logis') knockThreshold = 38;
  if (personality === 'pintar') knockThreshold = 36;
  if (personality === 'licik') knockThreshold = Math.floor(Math.random() * 6) + 33;
  if (personality === 'pintar_licik') knockThreshold = Math.floor(Math.random() * 5) + 34;
  if (botFinalScore >= knockThreshold) {
    const playerScore = calculateScore(gameState.playerHand);
    // prettier-ignore
    let resultText = `🤖 *Bot memutuskan untuk mengetuk!* 🤖\n\n` +
      `Tangan Bot (Skor: *${botFinalScore}*):\n${formatKartu(gameState.botHand)}\n\n` +
      `Tangan Kamu (Skor: *${playerScore}*):\n${formatKartu(gameState.playerHand)}\n\n`;
    if (botFinalScore > playerScore) resultText += `🤖 Bot menang!`;
    else if (playerScore > botFinalScore) resultText += `🎉 Selamat, kamu menang!`;
    else resultText += `🤝 Hasilnya seri!`;
    await fn.sendPesan(toId, resultText, { ephemeralExpiration: m.expiration ?? 0 });
    delete game41Sessions[toId];
    return;
  }
  gameState.turn = 'player';
  // prettier-ignore
  const groupMessage = `Bot telah bergerak dan membuang kartu [ ${discardedCard.display} ].\n\n` +
    `Giliranmu, @${gameState.playerJid.split('@')[0]}! Cek DM untuk melihat kartumu.`;
  await fn.sendPesan(toId, groupMessage, { ephemeralExpiration: m.expiration ?? 0 });
  // prettier-ignore
  const privateMessage = `Bot membuang [ ${discardedCard.display} ].\n\n` +
    `Kartu Kamu saat ini:\n${formatKartu(gameState.playerHand)}\n\n` +
    `Pilih aksimu di grup: *ambil dek* atau *ambil buangan*.`;
  const expiration = await fn.getEphemeralExpiration(gameState.playerJid);
  await fn.sendPesan(gameState.playerJid, privateMessage, { ephemeralExpiration: expiration });
}
export async function runBotSamgongTurn(toId, m, fn, samgongSessions) {
  const gameState = samgongSessions[toId];
  if (!gameState) return;
  // prettier-ignore
  let botTurnText = `Kartu awal Bandar adalah [ ${gameState.botHand.map(c => c.display).join(' | ')} ], ` +
    `Total nilai: *${calculateSamgongValue(gameState.botHand)}*.`;
  await fn.sendReply(toId, botTurnText, m);
  await delay(2000);
  while (calculateSamgongValue(gameState.botHand) <= 25) {
    const newCard = gameState.deck.shift();
    if (!newCard) break;
    gameState.botHand.push(newCard);
    // prettier-ignore
    botTurnText = `Bandar mengambil kartu... [ ${newCard.display} ].\n` +
      `Total nilai sekarang: *${calculateSamgongValue(gameState.botHand)}*`;
    await fn.sendReply(toId, botTurnText, m);
    await delay(2000);
  }
  const botScore = calculateSamgongValue(gameState.botHand);
  const playerScore = calculateSamgongValue(gameState.playerHand);
  const botSpecial = getSpecialHandName(gameState.botHand);
  const playerSpecial = getSpecialHandName(gameState.playerHand);
  // prettier-ignore
  let resultText = `*--- HASIL AKHIR ---*\n\n` +
    `Tangan Kamu (${playerSpecial ? playerSpecial : "Nilai: *" + playerScore + "*"})\n` +
    `Tangan Bandar (${botSpecial ? botSpecial : "Nilai: *" + botScore + "*"})\n\n`;
  if (botSpecial || playerSpecial) {
    const rank = specialHandRules.map((r) => r.name);
    if (botSpecial && playerSpecial) {
      const botRank = rank.indexOf(botSpecial);
      const playerRank = rank.indexOf(playerSpecial);
      if (playerRank < botRank) {
        resultText += `⭐️ Kamu menang dengan *${playerSpecial}*!`;
      } else if (botRank < playerRank) {
        resultText += `🤖 Bot menang dengan *${botSpecial}*!`;
      } else {
        resultText += `🤝 Hasilnya seri, keduanya punya *${playerSpecial}*! (Bandar menang!)`;
      }
    } else if (playerSpecial) {
      resultText += `⭐️ Kamu menang dengan *${playerSpecial}*!`;
    } else {
      resultText += `🤖 Bot menang dengan *${botSpecial}*!`;
    }
  } else if (botScore > 30) {
    resultText += `💥 Bandar HANGUS! Kamu menang!`;
  } else if (playerScore > botScore) {
    resultText += `🎉 Selamat, Kamu menang!`;
  } else if (botScore > playerScore) {
    resultText += `🤖 Bot menang!`;
  } else {
    resultText += `🤝 Hasilnya seri (Bandar menang)!`;
  }
  await fn.sendPesan(toId, resultText, { ephemeralExpiration: m.expiration ?? 0 });
  delete samgongSessions[toId];
}
