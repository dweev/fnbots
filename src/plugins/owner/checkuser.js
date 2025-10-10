// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';
import dayjs from '../../../src/utils/dayjs.js';

export const command = {
  name: 'checkuser',
  category: 'owner',
  description: 'Memeriksa informasi lengkap database user',
  isCommandWithoutPayment: true,
  execute: async ({ mentionedJidList, quotedParticipant, sReply, serial }) => {
    const targetId = quotedParticipant || (mentionedJidList && mentionedJidList[0]) || serial;
    const targetUser = await User.ensureUser(targetId);
    const formatDate = (date) => {
      if (!date) return 'Tidak ada';
      return dayjs(date).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss');
    };
    const formatBalance = (balance) => {
      try {
        return balance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      } catch {
        return '0';
      }
    };
    const totalCommands = Array.from(targetUser.commandStats.values()).reduce((a, b) => a + b, 0);
    const topCommands = Array.from(targetUser.commandStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cmd, count]) => `• ${cmd}: ${count}x`)
      .join('\n');
    let message = '';
    message += `\`\`\`DATABASE USER INFO\n\n`;
    message += `IDENTITAS\n`;
    message += `• User ID: @${targetId.split('@')[0]}\n`;
    message += `• User Count: ${targetUser.userCount}\n\n`;
    message += `STATUS KEANGGOTAAN\n`;
    message += `• Master: ${targetUser.isMaster ? '⚙' : '⚔'}\n`;
    message += `• VIP: ${targetUser.isVIP ? '⚙' : '⚔'}\n`;
    message += `• VIP Active: ${targetUser.isVIPActive ? '⚙' : '⚔'}\n`;
    message += `• VIP Expired: ${formatDate(targetUser.vipExpired)}\n`;
    message += `• Premium: ${targetUser.isPremium ? '⚙' : '⚔'}\n`;
    message += `• Premium Active: ${targetUser.isPremiumActive ? '⚙' : '⚔'}\n`;
    message += `• Premium Expired: ${formatDate(targetUser.premiumExpired)}\n\n`;
    message += `LIMIT & GAME\n`;
    message += `• Limit Saat Ini: ${targetUser.limit.current}\n`;
    message += `• Limit Warned: ${targetUser.limit.warned ? '⚙' : '⚔'}\n`;
    message += `• Limit Reset: ${formatDate(targetUser.limit.lastReset)}\n`;
    message += `• Game Limit: ${targetUser.limitgame.current}\n`;
    message += `• Game Warned: ${targetUser.limitgame.warned ? '⚙' : '⚔'}\n`;
    message += `• Game Reset: ${formatDate(targetUser.limitgame.lastReset)}\n\n`;
    message += `EKONOMI & LEVEL\n`;
    message += `• Balance: ${formatBalance(targetUser.balance)}\n`;
    message += `• XP: ${targetUser.xp}/${targetUser.maxXp}\n`;
    message += `• Level: ${targetUser.level} (${targetUser.levelName})\n`;
    message += `• Gacha: ${targetUser.gacha ? '⚙' : '⚔'}\n\n`;
    message += `STATISTIK COMMAND\n`;
    message += `• Total Command: ${totalCommands}x\n`;
    message += `• Top Commands:\n`;
    message += topCommands ? `${topCommands}\n\n` : '• Belum ada data\n\n';
    message += `INVENTORY\n`;
    message += `• Total Items: ${targetUser.inventory.size}\n`;
    if (targetUser.inventory.size > 0) {
      const inventoryItems = Array.from(targetUser.inventory.entries())
        .slice(0, 5)
        .map(([item, data]) => {
          const amount = typeof data === 'object' && data.amount ? data.amount : data;
          return `• ${item}: ${amount}`;
        })
        .join('\n');
      message += `${inventoryItems}\n`;
      if (targetUser.inventory.size > 5) {
        message += `• ... dan ${targetUser.inventory.size - 5} item lainnya\n`;
      }
    }
    message += `\n`;
    message += `TIMESTAMPS\n`;
    message += `• Created: ${formatDate(targetUser.createdAt)}\n`;
    message += `• Updated: ${formatDate(targetUser.updatedAt)}\`\`\``;
    await sReply(message);
  }
};