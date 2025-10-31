// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'setprivacypicture',
  displayName: 'setprivacy-picture',
  category: 'bot',
  description: 'Mengatur pengaturan privasi foto profile.',
  isCommandWithoutPayment: true,
  aliases: ['setprivacy-picture'],
  execute: async ({ fn, sReply, args }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['all', 'contacts', 'contact_blacklist', 'none'].includes(mode)) return await sReply(`gunakan argumen seperti all, contacts, contact_blacklist, none`);
    await fn.updateProfilePicturePrivacy(mode);
  }
};
