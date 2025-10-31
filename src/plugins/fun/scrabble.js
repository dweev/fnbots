// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { formatNumber } from '../../function/index.js';

const letters = {
  'a': 1,
  'b': 3,
  'c': 3,
  'd': 2,
  'e': 1,
  'f': 4,
  'g': 2,
  'h': 4,
  'i': 1,
  'j': 8,
  'k': 5,
  'l': 1,
  'm': 3,
  'n': 1,
  'o': 1,
  'p': 3,
  'q': 10,
  'r': 1,
  's': 1,
  't': 1,
  'u': 1,
  'v': 4,
  'w': 4,
  'x': 8,
  'y': 4,
  'z': 10
};

export const command = {
  name: 'scrabble',
  displayName: 'scrabble-score',
  category: 'fun',
  description: `Melihat info scrabble score`,
  isCommandWithoutPayment: true,
  aliases: ['scrabble-score'],
  execute: async ({ arg, sReply, dbSettings }) => {
    if (!arg) return await sReply(`Format salah!\nGunakan perintah seperti: ${dbSettings.sname}scrabble-score <kata>`);
    const word = arg;
    let score = 0;
    for (const letter of word.split('')) {
      if (!letters[letter]) continue;
      score += letters[letter];
    }
    await sReply(formatNumber(score));
  }
};
