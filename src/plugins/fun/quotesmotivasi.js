// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetch as nativeFetch } from '../../addon/bridge.js';

export const command = {
  name: 'quotesmotivasi',
  displayName: 'quotes-motivasi',
  category: 'fun',
  description: `Quotes Motivasi`,
  aliases: ['quotes-motivasi'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const response = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/pquotes.txt');
    if (!response.ok) return await sReply('Gagal mengambil data quotes motivasi.');
    const body = await response.text();
    const lines = body.split('\n').filter(x => x.trim());
    const quote = lines[Math.floor(Math.random() * lines.length)];
    await sReply(quote);
  }
};