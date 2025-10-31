// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { fetch as nativeFetch } from '../../addon/bridge.js';

export const command = {
  name: 'randomjoke',
  displayName: 'random-joke',
  category: 'fun',
  description: 'Joke random',
  aliases: ['random-joke'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, sReply }) => {
    const response = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/darkjoke.json');
    if (!response.ok) return await sReply('Gagal mengambil data darkjoke.');
    const allJokes = await response.json();
    const randomJoke = allJokes[Math.floor(Math.random() * allJokes.length)];
    const imageUrl = randomJoke.image;
    await fn.sendFileUrl(toId, imageUrl, '', m);
  }
};
