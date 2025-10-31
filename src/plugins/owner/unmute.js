// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { archimed } from '../../function/index.js';

export const command = {
  name: 'unmute',
  category: 'owner',
  description: 'Unban pengguna secara global',
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, user, mentionedJidList, quotedParticipant }) => {
    if (mentionedJidList && mentionedJidList.length > 0) {
      const usersToUnban = mentionedJidList;
      const unbannedUsers = [];
      for (const userId of usersToUnban) {
        if (user.isUserMuted(userId)) {
          await user.unmuteUser(userId);
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
      if (user.isUserMuted(userId)) {
        await user.unmuteUser(userId);
        await sReply(`Berhasil mengunban @${userId.split('@')[0]}`);
      } else {
        await sReply(`Pengguna @${userId.split('@')[0]} tidak dalam daftar banned`);
      }
      return;
    }
    if (args[0]) {
      const mutedUsers = user.mutedUsers.map((u) => u.userId);
      if (mutedUsers.length === 0) {
        await sReply('Tidak ada pengguna yang di-ban.');
        return;
      }
      const usersToUnban = archimed(args[0], mutedUsers);
      for (const userId of usersToUnban) {
        await user.unmuteUser(userId);
      }
      await sReply(`Berhasil mengunban ${usersToUnban.length} pengguna.`);
      return;
    }
    await sReply('Mohon mention pengguna, reply pesan, atau gunakan archimed.');
  }
};
