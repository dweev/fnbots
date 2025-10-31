// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'setprivacycalls',
  displayName: 'setprivacy-calls',
  category: 'bot',
  description: 'Mengatur pengaturan privasi calls.',
  isCommandWithoutPayment: true,
  aliases: ['setprivacy-calls'],
  execute: async ({ fn, sReply, args }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['all', 'known'].includes(mode)) return await sReply(`gunakan argumen seperti all, known`);
    await fn.updateCallPrivacy(mode);
  }
};
