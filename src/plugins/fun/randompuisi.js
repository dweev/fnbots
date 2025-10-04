// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';

export const command = {
  name: 'randompuisi',
  displayName: 'random-puisi',
  category: 'fun',
  description: `Puisi Random`,
  aliases: ['random-puisi'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const { data: allPuisi } = await axios.get('https://raw.githubusercontent.com/Terror-Machine/random/master/puisi.json');
    const randomPoem = allPuisi[Math.floor(Math.random() * allPuisi.length)];
    await sReply(randomPoem.puisi_with_header);
  }
};