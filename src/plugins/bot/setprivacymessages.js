// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'setprivacymessages',
  category: 'bot',
  description: 'Mengatur pengaturan privasi messages.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, sReply, args }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['all', 'contacts'].includes(mode)) return await sReply(`gunakan argumen seperti all, contacts`);
    await fn.updateMessagesPrivacy(mode);
  }
};