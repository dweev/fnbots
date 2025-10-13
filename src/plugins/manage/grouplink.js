// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'grouplink',
  category: 'manage',
  aliases: ['linkgroup', 'glink'],
  description: 'Memberikan link group.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, isBotGroupAdmins, toId, sReply }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan didalam group.`);
    if (!isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    const response = await fn.groupInviteCode(toId);
    await sReply(`https://chat.whatsapp.com/${response}`);
  }
};