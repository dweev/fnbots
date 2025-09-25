// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'grouppermission',
  category: 'manage',
  description: 'Memberikan informasi group.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, isBotGroupAdmins, toId, sReply, args, reactDone }) => {
    if (!m.isGroup || !isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan di grup dan bot harus menjadi admin grup.`);
    const mode = (args[0] || '').toLowerCase();
    if (!['locked', 'unlocked'].includes(mode)) return await sReply(`gunakan argumen seperti locked atau unlocked`);
    await fn.groupSettingUpdate(toId, mode); await reactDone();
  }
};