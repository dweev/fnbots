// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';

export const command = {
  name: 'checklimit',
  category: 'vip',
  description: 'Memeriksa limit kepada member',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, mentionedJidList, quotedParticipant, sReply }) => {
    let targetId = quotedParticipant || (mentionedJidList && mentionedJidList[0]);
    if (!targetId) {
      let message = '';
      message += `Tidak ada user yang ditargetkan!\n\n`;
      message += `Cara penggunaan:\n`;
      message += `• Reply pesan user yang ingin dicek limitnya, atau\n`;
      message += `• Mention user dengan @username\n\n`;
      message += `Contoh: ${dbSettings.rname}checklimit @user`;
      return await sReply(message);
    }
    const targetUser = await User.ensureUser(targetId);
    let message = '';
    message += `Informasi Limit Pengguna\n\n`;
    message += `Pengguna: @${targetId.split('@')[0]}\n`;
    message += `Sisa Limit Umum: *${targetUser.limit.current}*\n`;
    message += `Sisa Limit Game: *${targetUser.limitgame.current}*\n\n`;
    if (targetUser.isPremium) {
      message += `Status: Premium\n`;
      message += `Limit Premium: Unlimited`;
    } else {
      message += `Status: Regular`;
    }
    await sReply(message);
  }
};