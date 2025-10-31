// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { fetch as nativeFetch } from '../../addon/bridge.js';

export const command = {
  name: 'quotescinta',
  displayName: 'quotes-cinta',
  category: 'fun',
  description: 'Quotes Cinta',
  aliases: ['quotes-cinta'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const response = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/cinta.txt');
    if (!response.ok) return await sReply('Gagal mengambil data quotes cinta.');
    const body = await response.text();
    const lines = body.split('\n').filter((x) => x.trim());
    const quote = lines[Math.floor(Math.random() * lines.length)];
    await sReply(quote);
  }
};
