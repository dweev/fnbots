// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { archimed } from '../../function/index.js';

export const command = {
  name: 'unban',
  category: 'manage',
  description: 'Unban pengguna didalam group',
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, groupData, mentionedJidList, quotedParticipant }) => {
    if (mentionedJidList && mentionedJidList.length > 0) {
      const usersToUnban = mentionedJidList;
      const unbannedUsers = [];
      for (const userId of usersToUnban) {
        if (groupData.isMemberBanned(userId)) {
          await groupData.unbanMember(userId);
          unbannedUsers.push(userId);
        }
      }
      if (unbannedUsers.length > 0) {
        await sReply(`Berhasil mengunban ${unbannedUsers.map((u) => `@${u.split('@')[0]}`).join(', ')}`);
      } else {
        await sReply('Tidak ada pengguna yang di-unban');
      }
      return;
    }
    if (quotedParticipant) {
      const userId = quotedParticipant;
      if (groupData.isMemberBanned(userId)) {
        await groupData.unbanMember(userId);
        await sReply(`Berhasil mengunban @${userId.split('@')[0]}`);
      } else {
        await sReply(`Pengguna @${userId.split('@')[0]} tidak dalam daftar banned`);
      }
      return;
    }
    if (args[0]) {
      const bannedMembers = groupData.bannedMembers.map((u) => u.userId);
      if (bannedMembers.length === 0) {
        await sReply('Tidak ada pengguna yang di-ban.');
        return;
      }
      const usersToUnban = archimed(args[0], bannedMembers);
      for (const userId of usersToUnban) {
        await groupData.unbanMember(userId);
      }
      await sReply(`Berhasil mengunban ${usersToUnban.length} pengguna.`);
      return;
    }
    await sReply('Mohon mention pengguna, reply pesan, atau gunakan archimed.');
  }
};
