// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'setprivacylastseen',
  displayName: 'setprivacy-lastseen',
  category: 'bot',
  description: 'Mengatur pengaturan privasi terakhir dilihat.',
  isCommandWithoutPayment: true,
  aliases: ['setprivacy-lastseen'],
  execute: async ({ fn, sReply, args }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['all', 'contacts', 'contact_blacklist', 'none'].includes(mode)) return await sReply(`gunakan argumen seperti all, contacts, contact_blacklist, none`);
    await fn.updateLastSeenPrivacy(mode);
  }
};