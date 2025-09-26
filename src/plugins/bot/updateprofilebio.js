// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'updateprofilebio',
  category: 'bot',
  description: 'Mengubah bio profil bot.',
  isCommandWithoutPayment: true,
  aliases: ['setbio', 'upbio', 'updatebio'],
  execute: async ({ fn, reactDone, botNumber }) => {
    await fn.removeProfilePicture(botNumber);
    await reactDone();
  }
};