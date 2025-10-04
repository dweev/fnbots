// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'groupid',
  category: 'util',
  description: 'Mendapatkan info id group',
  aliases: ['gid'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, toId }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    const groupchat = await fn.groupMetadata(toId);
    const { id } = groupchat;
    await sReply(id);
  }
};