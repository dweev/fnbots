// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'updateprofilename',
  displayName: 'update-profilename',
  category: 'bot',
  description: 'Mengubah nama profil bot.',
  isCommandWithoutPayment: true,
  aliases: ['setname', 'setbotname', 'upname', 'update-profilename'],
  execute: async ({ fn, reactDone, arg, dbSettings, sReply }) => {
    if (!arg) return await sReply(`gunakan argumen yang valid seperti ${dbSettings.rname}updateprofilename Udah Yappingnya?`);
    await fn.updateProfileName(arg.trim());
    await reactDone();
  }
};
