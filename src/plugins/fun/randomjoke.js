// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import axios from 'axios';

export const command = {
  name: 'randomjoke',
  displayName: 'random-joke',
  category: 'fun',
  description: `Joke random`,
  aliases: ['random-joke'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId }) => {
    const { data: allJokes } = await axios.get('https://raw.githubusercontent.com/Terror-Machine/random/master/darkjoke.json');
    const randomJoke = allJokes[Math.floor(Math.random() * allJokes.length)];
    const imageUrl = randomJoke.image;
    await fn.sendFileUrl(toId, imageUrl, '', m);
  }
};