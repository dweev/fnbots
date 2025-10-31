// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { randomChoice } from '../../function/index.js';
import quotes from '../../games/animequotes.json' with { type: 'json' };

export const command = {
  name: 'quotesanime',
  displayName: 'quotes-anime',
  category: 'fun',
  description: `Quotes Anime`,
  aliases: ['quotes-anime'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const data = randomChoice(quotes);
    const text = `🎌 *Anime*: ${data.anime}\n👤 *Name*: ${data.name}\n💬 *Quote*: ${data.quote}`;
    await sReply(text);
  }
};
