// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetch as nativeFetch } from '../../addon/bridge.js';

export const command = {
  name: 'randompuisi',
  displayName: 'random-puisi',
  category: 'fun',
  description: `Puisi Random`,
  aliases: ['random-puisi'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const response = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/puisi.json');
    if (!response.ok) return await sReply('Gagal mengambil data puisi.');
    const allPuisi = await response.json();
    const randomPoem = allPuisi[Math.floor(Math.random() * allPuisi.length)];
    await sReply(randomPoem.puisi_with_header);
  }
};