// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'deletegroupicon',
  category: 'manage',
  description: 'Menghapus foto profile group',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, sReply, isBotGroupAdmins, m, reactDone }) => {
    if (!m.isGroup || !isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan di grup dan bot harus menjadi admin grup.`);
    await fn.removeProfilePicture(toId); await reactDone();
  }
};