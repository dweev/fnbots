// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';
import { archimed } from '../../function/index.js';

export const command = {
  name: 'unmute',
  category: 'owner',
  description: 'Unban pengguna secara global',
  isCommandWithoutPayment: true,
  execute: async ({ args, sReply, mentionedJidList, quotedParticipant }) => {
    if (mentionedJidList && mentionedJidList.length > 0) {
      const unbannedUsers = [];
      for (const userId of mentionedJidList) {
        const targetUser = await User.ensureUser(userId);
        if (targetUser.isMuted) {
          await targetUser.unmute();
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
      const targetUser = await User.ensureUser(quotedParticipant);
      if (targetUser.isMuted) {
        await targetUser.unmute();
        await sReply(`Berhasil mengunban @${quotedParticipant.split('@')[0]}`);
      } else {
        await sReply(`Pengguna @${quotedParticipant.split('@')[0]} tidak dalam daftar banned`);
      }
      return;
    }
    if (args[0]) {
      const mutedUsers = await User.find({ isMuted: true }).select('userId');
      if (mutedUsers.length === 0) {
        await sReply('Tidak ada pengguna yang di-ban.');
        return;
      }
      const mutedUserIds = mutedUsers.map((u) => u.userId);
      const usersToUnban = archimed(args[0], mutedUserIds);
      let unbannedCount = 0;
      for (const userId of usersToUnban) {
        const targetUser = await User.findOne({ userId });
        if (targetUser && targetUser.isMuted) {
          await targetUser.unmute();
          unbannedCount++;
        }
      }
      await sReply(`Berhasil mengunban ${unbannedCount} pengguna.`);
      return;
    }
    await sReply('Mohon mention pengguna, reply pesan, atau gunakan archimed (contoh: 1-5, 1,3,5).');
  }
};
