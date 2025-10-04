// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';

export const command = {
  name: 'randomfakta',
  displayName: 'random-fakta',
  category: 'fun',
  description: `Fakta Kerandoman..`,
  aliases: ['random-fakta'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const { data: body } = await axios.get('https://raw.githubusercontent.com/Terror-Machine/random/master/fakta.txt');
    const lines = body.split('\n').filter(x => x.trim());
    const quote = lines[Math.floor(Math.random() * lines.length)];
    await sReply(quote);
  }
};