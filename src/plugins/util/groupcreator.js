// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'groupcreator',
  category: 'util',
  description: 'Mendapatkan info creator group',
  aliases: ['gcreator'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, toId, store }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    const groupchat = await store.getGroupMetadata(toId);
    const { subject, subjectOwner, subjectOwnerPn } = groupchat;
    let creatorId;
    if (subjectOwnerPn === undefined) {
      creatorId = subjectOwner;
    } else {
      creatorId = subjectOwnerPn;
    }
    if (!creatorId) return await sReply(`Tidak dapat menemukan ID pembuat grup.`);
    const creatorNumber = creatorId.split('@')[0];
    await fn.sendContact(toId, 'Group Creator', subject, creatorNumber, m);
  }
};
