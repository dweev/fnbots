// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';

export const command = {
  name: 'randomwaifu',
  displayName: 'random-waifu',
  category: 'fun',
  description: `Halu randomin waifu dasar wibu!`,
  aliases: ['random-waifu'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId }) => {
    const { data: body } = await axios.get('https://raw.githubusercontent.com/Terror-Machine/random/master/waifu.txt');
    const lines = body.split('\n').filter(line => line.trim() !== '');
    const randomUrl = lines[Math.floor(Math.random() * lines.length)];
    await fn.sendFileUrl(toId, randomUrl, '', m);
  }
};