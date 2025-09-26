// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'deleteprofilepicture',
  category: 'bot',
  description: 'Menghapus foto profil bot.',
  isCommandWithoutPayment: true,
  aliases: ['removepp', 'deleteprofilepic', 'hapuspp'],
  execute: async ({ fn, reactDone, botNumber }) => {
    await fn.removeProfilePicture(botNumber);
    await reactDone();
  }
};