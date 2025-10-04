// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'bye',
  category: 'manage',
  description: 'mengeluarkan bot dari group',
  aliases: ['out'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, reactDone, sReply }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    await reactDone();
    await fn.groupLeave(toId);
  }
};