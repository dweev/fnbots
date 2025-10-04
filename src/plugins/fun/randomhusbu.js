// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';

export const command = {
  name: 'randomhusbu',
  displayName: 'random-husbu',
  category: 'fun',
  description: `Halu randomin husbu!`,
  aliases: ['random-husbu'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId }) => {
    const { data: body } = await axios.get('https://raw.githubusercontent.com/Terror-Machine/random/master/husbu.txt');
    const lines = body.split('\n').filter(line => line.trim() !== '');
    const randomUrl = lines[Math.floor(Math.random() * lines.length)];
    await fn.sendFileUrl(toId, randomUrl, '', m);
  }
};