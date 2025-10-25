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
  execute: async ({ m, sReply, toId, store }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    const groupchat = await store.getGroupMetadata(toId);
    const { id } = groupchat;
    await sReply(id);
  }
};