// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'getprivacysettings',
  category: 'bot',
  description: 'Mendapatkan pengaturan privasi bot.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, sReply }) => {
    const privacySettings = await fn.fetchPrivacySettings(true);
    let privacyMessage = '*Pengaturan Privasi:*\n\n';
    privacyMessage += `- *Read Receipts*: ${privacySettings.readreceipts}\n`;
    privacyMessage += `- *Profil*: ${privacySettings.profile}\n`;
    privacyMessage += `- *Status*: ${privacySettings.status}\n`;
    privacyMessage += `- *Online*: ${privacySettings.online}\n`;
    privacyMessage += `- *Last Seen*: ${privacySettings.last}\n`;
    privacyMessage += `- *Groups*: ${privacySettings.groupadd}\n`;
    privacyMessage += `- *Calls?*: ${privacySettings.calladd}\n`;
    privacyMessage += `- *Stiker*: ${privacySettings.stickers}\n`;
    privacyMessage += `- *Pesan*: ${privacySettings.messages}\n`;
    await sReply(privacyMessage);
  }
};
