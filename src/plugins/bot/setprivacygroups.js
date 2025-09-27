// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'setprivacygroups',
  displayName: 'setprivacy-groups',
  category: 'bot',
  description: 'Mengatur pengaturan privasi group add.',
  isCommandWithoutPayment: true,
  aliases: ['setprivacy-groups'],
  execute: async ({ fn, sReply, args }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['all', 'contacts', 'contact_blacklist'].includes(mode)) return await sReply(`gunakan argumen seperti all, contacts, contact_blacklist`);
    await fn.updateGroupsAddPrivacy(mode);
  }
};