// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';

export const command = {
  name: 'mute',
  category: 'owner',
  description: 'Ban pengguna secara global',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, mentionedJidList, quotedParticipant }) => {
    if (mentionedJidList && mentionedJidList.length > 0) {
      const bannedUsers = [];
      for (const userId of mentionedJidList) {
        const targetUser = await User.ensureUser(userId);
        if (!targetUser.isMuted) {
          await targetUser.mute();
          bannedUsers.push(userId);
        }
      }
      if (bannedUsers.length > 0) {
        await sReply(`Berhasil membanning ${bannedUsers.map((u) => `@${u.split('@')[0]}`).join(', ')}`);
      } else {
        await sReply('Tidak ada pengguna baru yang di-ban');
      }
      return;
    }
    if (quotedParticipant) {
      const targetUser = await User.ensureUser(quotedParticipant);
      if (!targetUser.isMuted) {
        await targetUser.mute();
        await sReply(`Berhasil membanning @${quotedParticipant.split('@')[0]}`);
      } else {
        await sReply(`Pengguna @${quotedParticipant.split('@')[0]} sudah dibanned`);
      }
      return;
    }
    await sReply('Mohon mention pengguna atau reply pesan pengguna.');
  }
};
