// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';

export const command = {
  name: 'randomneko',
  displayName: 'random-neko',
  category: 'fun',
  description: `Kucing random gambar kirim!`,
  aliases: ['random-neko'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId }) => {
    const { data: body } = await axios.get('https://raw.githubusercontent.com/Terror-Machine/random/master/neko.txt');
    const lines = body.split('\n').filter(line => line.trim() !== '');
    const randomUrl = lines[Math.floor(Math.random() * lines.length)];
    await fn.sendFileUrl(toId, randomUrl, '', m);
  }
};