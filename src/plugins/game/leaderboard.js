// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';
import { formatNumber } from '../../function/index.js';

export const command = {
  name: 'leaderboard',
  category: 'game',
  description: 'Melihat papan peringkat berdasarkan XP, Level, atau Balance.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, args, dbSettings }) => {
    const validTypes = ['xp', 'level', 'balance'];
    const type = args[0]?.toLowerCase() || 'balance';
    if (!validTypes.includes(type)) return await sReply(`Tipe tidak valid. Gunakan: ${validTypes.join(', ')}\nContoh: ${dbSettings.rname}leaderboard balance`);
    const topUsers = await User.getLeaderboard(type, 10);
    if (!topUsers || topUsers.length === 0) return await sReply(`Belum ada seorang pun di leaderboard ${type}.`);
    let replyText = `🏆 *Top 10 Leaderboard - ${type.toUpperCase()}*\n\n`;
    topUsers.forEach((user, index) => {
      if (!user || !user.userId) return;
      const userNumber = user.userId.split('@')[0];
      replyText += `*${index + 1}.* @${userNumber}\n`;
      replyText += `   - 🌟 Level: ${user.level} (${user.levelName})\n`;
      replyText += `   - ✨ XP: ${user.xp.toLocaleString()}\n`;
      replyText += `   - 💰 Balance: $${formatNumber(user.balance)}\n\n`;
    });
    await sReply(replyText);
  }
};
