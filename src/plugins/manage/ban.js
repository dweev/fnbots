// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'ban',
  category: 'manage',
  description: 'Ban pengguna didalam group.',
  isCommandWithoutPayment: true,
  execute: async ({ groupData, sReply, mentionedJidList, quotedParticipant }) => {
    if (mentionedJidList && mentionedJidList.length > 0) {
      const usersToBan = mentionedJidList;
      const bannedUsers = [];
      for (const userId of usersToBan) {
        if (!groupData.isMemberBanned(userId)) {
          await groupData.banMember(userId);
          bannedUsers.push(userId);
        }
      }
      if (bannedUsers.length > 0) {
        await sReply(`Berhasil membanned ${bannedUsers.map(u => `@${u.split('@')[0]}`).join(', ')}`);
      } else {
        await sReply('Tidak ada pengguna baru yang di-ban');
      }
      return;
    }
    if (quotedParticipant) {
      const userId = quotedParticipant;
      if (!groupData.isMemberBanned(userId)) {
        await groupData.banMember(userId);
        await sReply(`Berhasil membanned @${userId.split('@')[0]}`);
      } else {
        await sReply(`Pengguna @${userId.split('@')[0]} sudah dibanned`);
      }
      return;
    }
    await sReply('Mohon mention pengguna atau reply pesan pengguna.');
  }
};