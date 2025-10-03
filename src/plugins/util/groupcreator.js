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
  execute: async ({ fn, m, sReply, toId }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    const groupchat = await fn.groupMetadata(toId);
    const { subject, subjectOwner, subjectOwnerPhoneNumber } = groupchat;
    let creatorId;
    if (subjectOwnerPhoneNumber === undefined) {
      creatorId = subjectOwner;
    } else {
      creatorId = subjectOwnerPhoneNumber;
    }
    if (!creatorId) return await sReply(`Tidak dapat menemukan ID pembuat grup.`);
    const creatorNumber = creatorId.split('@')[0];
    await fn.sendContact(toId, "Group Creator", subject, creatorNumber, m);
  }
};