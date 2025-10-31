// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';

export const command = {
  name: 'giftlimit',
  category: 'vip',
  description: 'Memberikan tambahan limit kepada member',
  aliases: ['gift'],
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, mentionedJidList, args, quotedParticipant, sReply }) => {
    const limitValue = parseInt(args[0]);
    if (isNaN(limitValue)) {
      let message = '';
      message += `Nilai limit tidak valid!\n\n`;
      message += `Cara penggunaan:\n`;
      message += `${dbSettings.rname}giftlimit <jumlah>\n\n`;
      message += `Contoh: ${dbSettings.rname}giftlimit 10\n`;
      message += `(Reply pesan target atau mention user)`;
      return await sReply(message);
    }
    if (limitValue > 100) {
      let message = '';
      message += `Jumlah limit terlalu besar!\n\n`;
      message += `Maksimal gift limit: 100\n`;
      message += `Gunakan nilai antara 1-100.`;
      return await sReply(message);
    }
    if (limitValue < 1) {
      let message = '';
      message += `Jumlah limit terlalu kecil!\n\n`;
      message += `Minimal gift limit: 1\n`;
      message += `Mmessagekkan nilai positif untuk memberikan limit.`;
      return await sReply(message);
    }
    const targetId = quotedParticipant || (mentionedJidList && mentionedJidList[0]);
    if (!targetId) {
      let message = '';
      message += `Target user tidak ditemukan!\n\n`;
      message += `Cara penggunaan:\n`;
      message += `• Reply pesan user yang ingin diberi limit, atau\n`;
      message += `• Mention user dengan @username\n\n`;
      message += `Contoh: ${dbSettings.rname}giftlimit 10 @user`;
      return await sReply(message);
    }
    const targetUser = await User.ensureUser(targetId);
    const previousLimit = targetUser.limit.current;
    targetUser.limit.current += limitValue;
    await targetUser.save();
    let message = '';
    message += `*GIFT LIMIT BERHASIL!*\n\n`;
    message += `Jumlah diberikan: ${limitValue} limit\n`;
    message += `Penerima: @${targetId.split('@')[0]}\n`;
    message += `Limit sebelumnya: ${previousLimit}\n`;
    message += `Limit sekarang: ${targetUser.limit.current}\n\n`;
    message += `Selamat! Limit telah berhasil diberikan.`;
    await sReply(message);
  }
};
