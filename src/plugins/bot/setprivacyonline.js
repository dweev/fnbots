// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'setprivacyonline',
  displayName: 'setprivacy-online',
  category: 'bot',
  description: 'Mengatur pengaturan privasi online.',
  isCommandWithoutPayment: true,
  aliases: ['setprivacy-online'],
  execute: async ({ fn, sReply, args }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['all', 'match_last_seen'].includes(mode)) return await sReply(`gunakan argumen seperti all, match_last_seen`);
    await fn.updateOnlinePrivacy(mode);
  }
};