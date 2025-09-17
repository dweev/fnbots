// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'ping',
  category: 'util',
  description: 'Memeriksa waktu respons bot.',
  aliases: ['p', 'speed'],
  execute: async ({ sPesan, m }) => {
    const current = new Date().getTime();
    const est = Math.floor(current - (m.timestamp * 1000));
    await sPesan(`Response time: ${est}ms`);
  }
};