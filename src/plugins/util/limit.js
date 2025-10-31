// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'limit',
  category: 'util',
  description: 'Mengecek sisa limit penggunaan dan game Anda.',
  aliases: ['ceklimit'],
  isCommandWithoutPayment: true,
  execute: async ({ user, sReply, isSadmin }) => {
    let replyText;
    if (isSadmin || user.isMaster || user.isVIPActive) {
      const status = isSadmin ? 'SAdmin' : user.isMaster ? 'Master' : 'VIP';
      replyText = `Status: *${status}*\nCredit Penggunaan: *Tak Terbatas*`;
    } else {
      const usageLimit = user.limit.current;
      const gameLimit = user.limitgame.current;
      const userStatus = user.isPremiumActive ? 'Premium' : 'Standard';
      // prettier-ignore
      replyText =
        `Status: *${userStatus}*\n\n` +
        `Sisa credit kamu:\n` +
        `┠ Limit Penggunaan: *${usageLimit}*\n` +
        `┖ Limit Game: *${gameLimit}*`;
    }
    await sReply(replyText);
  }
};
