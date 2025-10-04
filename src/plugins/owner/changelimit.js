// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';

export const command = {
  name: 'changelimit',
  category: 'owner',
  description: 'Mengatur limit member',
  aliases: ['ubah', 'setlimit'],
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, mentionedJidList, args, quotedParticipant, sReply }) => {
    const limitValue = parseInt(args[0]);
    const targetId = quotedParticipant || (mentionedJidList && mentionedJidList[0]);
    if (!targetId) {
      let message = '';
      message += `Target user tidak ditemukan!\n\n`;
      message += `Cara penggunaan:\n`;
      message += `• Reply pesan user yang ingin diubah limit, atau\n`;
      message += `• Mention user dengan @username\n\n`;
      message += `Contoh: ${dbSettings.rname}changelimit 10 @user`;
      return await sReply(message);
    }
    const targetUser = await User.ensureUser(targetId);
    const previousLimit = targetUser.limit.current;
    targetUser.limit.current = limitValue;
    await targetUser.save();
    let message = '';
    message += `*UBAH LIMIT BERHASIL!*\n\n`;
    message += `Jumlah Diatur: ${limitValue} limit\n`;
    message += `Penerima: @${targetId.split('@')[0]}\n`;
    message += `Limit sebelumnya: ${previousLimit}\n`;
    message += `Limit sekarang: ${targetUser.limit.current}\n\n`;
    message += `Selamat! Limit telah berhasil dirubah.`;
    await sReply(message);
  }
};