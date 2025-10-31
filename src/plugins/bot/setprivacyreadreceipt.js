// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'setprivacyreadreceipt',
  displayName: 'setprivacy-readreceipt',
  category: 'bot',
  description: 'Mengatur pengaturan privasi read receipts.',
  isCommandWithoutPayment: true,
  aliases: ['setprivacy-readreceipt'],
  execute: async ({ fn, sReply, args }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['all', 'none'].includes(mode)) return await sReply(`gunakan argumen seperti all, none`);
    await fn.updateReadReceiptsPrivacy(mode);
  }
};
