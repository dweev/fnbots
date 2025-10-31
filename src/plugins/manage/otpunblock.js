// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { OTPSession, Group } from '../../../database/index.js';

export const command = {
  name: 'otpunblock',
  displayName: 'otp-unblock',
  category: 'manage',
  description: 'Unblock pengguna yang terblokir karena gagal OTP di grup ini',
  isCommandWithoutPayment: true,
  aliases: ['otp-unblock'],
  execute: async ({ m, sReply, mentionedJidList, quotedParticipant, reactDone, toId }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di grup!');
    let targetUser = null;
    if (quotedParticipant) targetUser = quotedParticipant;
    else if (mentionedJidList.length > 0) targetUser = mentionedJidList[0];
    if (!targetUser) return await sReply('Mention atau reply pengguna untuk unblock.');
    await OTPSession.unblockUser(targetUser);
    const groupData = await Group.findOne({ groupId: toId });
    if (groupData) {
      await groupData.unbanMember(targetUser);
    }
    const username = targetUser.split('@')[0];
    await sReply(`@${username} berhasil di-unblock dari grup ini dan sistem OTP.`);
    await reactDone();
  }
};
