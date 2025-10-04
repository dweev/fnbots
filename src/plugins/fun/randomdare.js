// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';

export const command = {
  name: 'randomdare',
  displayName: 'random-dare',
  category: 'fun',
  description: `Ayo Test KEBERANIANMU!!`,
  aliases: ['random-dare'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const { data: body } = await axios.get('https://raw.githubusercontent.com/Terror-Machine/random/master/dare.txt');
    const lines = body.split('\n').filter(x => x.trim());
    const quote = lines[Math.floor(Math.random() * lines.length)];
    await sReply(quote);
  }
};