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
  execute: async ({ fn, m, isBotGroupAdmins, toId, sReply }) => {
    if (!m.isGroup || !isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    let response = await fn.groupInviteCode(toId)
    await sReply(`https://chat.whatsapp.com/${response}`);
  }
};