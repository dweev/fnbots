// ─── Info ────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/casino.js ─────────────

export const formatHandSimple = (hand) => hand.map(c => `[${c.rank}${c.suit}]`).join(' ');
export const getHandDetails = (hand) => {
  const rankToValue = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  const sortedHand = hand.slice().sort((a, b) => rankToValue[a.rank] - rankToValue[b.rank]);
  const values = sortedHand.map(c => rankToValue[c.rank]);
  const suits = sortedHand.map(c => c.suit);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = (values[0] + 1 === values[1] && values[1] + 1 === values[2]) || (values[0] === 2 && values[1] === 3 && values[2] === 14);
  if (isStraight && isFlush) return { rankValue: 6, name: '🐉 DRAGON 🐉 (Straight Flush)' };
  if (values[0] === values[1] && values[1] === values[2]) return { rankValue: 5, name: 'Three of a Kind' };
  if (isStraight) return { rankValue: 4, name: 'Straight' };
  if (isFlush) return { rankValue: 3, name: 'Flush' };
  if (values[0] === values[1] || values[1] === values[2]) return { rankValue: 2, name: 'Pair' };
  const highCardRank = Object.keys(rankToValue).find(key => rankToValue[key] === values[2]);
  return { rankValue: 1, name: `High Card ${highCardRank}` };
};
export const anteBonusMultipliers = {
  6: 52n, 5: 10n, 4: 5n, 3: 2n, 2: 1n
};
export const specialHandRules = [
  { name: "Empat As dengan Kartu Kecil", check: isFourAcesWithLow },
  { name: "Empat As", check: isFourAces },
  { name: "Pure Samgong", check: isPureSamgong },
  { name: "7 Kartu Kecil", check: isSevenCardLow },
  { name: "Kartu Kecil", check: isLowCardsOnly },
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
};
export function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
};
export function formatKartu(hand) {
  if (!hand || hand.length === 0) return "Tangan kosong.";
  return hand.map((card, index) => `${index + 1}. [ ${card.display} ]`).join('\n');
};
export function calculateScore(hand) {
  if (!hand || hand.length === 0) return 0;
  const scoresBySuit = {};
  for (const card of hand) {
    scoresBySuit[card.suit] = (scoresBySuit[card.suit] || 0) + card.value;
  }
  return Object.keys(scoresBySuit).length > 0 ? Math.max(...Object.values(scoresBySuit)) : 0;
};
export function isFourAces(hand) {
  const aceCount = hand.filter(card => card.rank === 'A').length;
  return aceCount >= 4;
};
export function isLowCardsOnly(hand) {
  return hand.every(card => ['2', '3', '4'].includes(card.rank));
};
export function isFourAcesWithLow(hand) {
  const aceCount = hand.filter(card => card.rank === 'A').length;
  const otherCards = hand.filter(card => card.rank !== 'A');
  return aceCount >= 4 && otherCards.every(card => ['2', '3', '4'].includes(card.rank));
};
export function isSevenCardLow(hand) {
  return hand.length === 7 && isLowCardsOnly(hand);
};
export function isPureSamgong(hand) {
  return hand.every(card => ['K', 'Q', 'J'].includes(card.rank));
};
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
};
export function getSpecialHandName(hand) {
  for (const rule of specialHandRules) {
    if (rule.check(hand)) return rule.name;
  }
  return null;
};