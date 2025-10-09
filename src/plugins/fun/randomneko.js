// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetch as nativeFetch } from '../../addon/bridge.js';

export const command = {
  name: 'randomneko',
  displayName: 'random-neko',
  category: 'fun',
  description: `Kucing random gambar kirim!`,
  aliases: ['random-neko'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, sReply }) => {
    const response = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/neko.txt');
    if (!response.ok) return await sReply('Gagal mengambil data neko.');
    const body = await response.text();
    const lines = body.split('\n').filter(line => line.trim() !== '');
    const randomUrl = lines[Math.floor(Math.random() * lines.length)];
    await fn.sendFileUrl(toId, randomUrl, '', m);
  }
};