// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';

export const command = {
  name: 'randombapak',
  displayName: 'random-bapak',
  category: 'fun',
  description: `Jokes Random Bapak`,
  aliases: ['random-bapak'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const { data: body } = await axios.get('https://raw.githubusercontent.com/Terror-Machine/random/master/statusbapack.txt');
    const lines = body.split('\n').filter(x => x.trim());
    const quote = lines[Math.floor(Math.random() * lines.length)];
    await sReply(quote);
  }
};