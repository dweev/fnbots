// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetch as nativeFetch } from '../../addon/bridge.js';

export const command = {
  name: 'randompantun',
  displayName: 'random-pantun',
  category: 'fun',
  description: `Pantun Random`,
  aliases: ['random-pantun'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const response = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/pantun.txt');
    if (!response.ok) return await sReply('Gagal mengambil data pantun.');
    const body = await response.text();
    const lines = body.split('\n').filter(x => x.trim());
    const quote = lines[Math.floor(Math.random() * lines.length)];
    await sReply(quote);
  }
};