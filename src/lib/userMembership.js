// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/userMembership.js ──────────────

import dayjs from '../utils/dayjs.js';
import { User } from '../../database/index.js';
import { formatDuration, formatDurationMessage, archimed } from '../function/index.js';

export function membershipUser(config) {
  const { type, aliases } = config;
  const capitalizedType = type.toUpperCase();
  const userModelMethods = {
    add: (userId, durationMs) => User.addPremium(userId, durationMs),
    remove: (userId) => User.removePremium(userId),
    findActive: () => User.find({ isPremium: true, premiumExpired: { $gt: new Date() } })
  };
  if (type.toLowerCase() === 'vip') {
    userModelMethods.add = (userId, durationMs) => User.addVIP(userId, durationMs);
    userModelMethods.remove = (userId) => User.removeVIP(userId);
    userModelMethods.findActive = () => User.find({ isVIP: true, vipExpired: { $gt: new Date() } });
  }
  return {
    name: type.toLowerCase(),
    category: 'owner',
    description: `Mengelola hak akses ${type} untuk pengguna.`,
    aliases: aliases,
    isCommandWithoutPayment: true,
    execute: async ({ sReply, args, mentionedJidList, quotedMsg, dbSettings }) => {
      const formatUserId = (input) => {
        if (!input) return null;
        const cleaned = input.replace(/[^0-9]/g, '');
        return cleaned ? `${cleaned}@s.whatsapp.net` : null;
      };
      const handleAddUser = async (userId, durationStr) => {
        if (!durationStr || !/^\d+[smhdwyM]$/i.test(durationStr)) {
          return await sReply('Format durasi tidak valid. Contoh: 30d');
        }
        const duration = formatDuration(durationStr);
        const msToAdd = duration.asMilliseconds();
        if (msToAdd <= 0) return await sReply('Durasi harus lebih dari 0');
        await userModelMethods.add(userId, msToAdd);
        const durationMessage = formatDurationMessage(duration);
        // prettier-ignore
        await sReply(
          `*「 PENAMBAHAN ${capitalizedType} 」*\n\n` +
          `*ID*: @${userId.split('@')[0]}\n` +
          `${durationMessage}`,
          { mentions: [userId] }
        );
      };
      const handleListUsers = async () => {
        const users = await userModelMethods.findActive();
        if (users.length === 0) {
          return await sReply(`Tidak ada pengguna ${type} aktif saat ini.`);
        }
        let listText = `*Daftar Pengguna ${capitalizedType}*\n\nTotal: *${users.length}*\n\n`;
        const mentions = [];
        users.sort((a, b) => b[`${type.toLowerCase()}Expired`] - a[`${type.toLowerCase()}Expired`]);
        users.forEach((user, index) => {
          const expiredDate = dayjs(user[`${type.toLowerCase()}Expired`]);
          const durationLeft = dayjs.duration(expiredDate.diff(dayjs()));
          const durationMessage = formatDurationMessage(durationLeft);
          mentions.push(user.userId);
          listText += `${index + 1}. @${user.userId.split('@')[0]}\n   ┗ Sisa Waktu: *${durationMessage.replace('*Expired*: ', '')}*\n`;
        });
        await sReply(listText, { mentions });
      };
      const handleDeleteUser = async (input) => {
        const jidsToDelete = new Set();
        if (quotedMsg) {
          jidsToDelete.add(quotedMsg.sender);
        }
        if (mentionedJidList.length > 0) {
          mentionedJidList.forEach((jid) => jidsToDelete.add(jid));
        }
        if (input) {
          const activeUsers = await userModelMethods.findActive();
          const selectedByArchimed = archimed(input, activeUsers);
          if (selectedByArchimed.length > 0) {
            selectedByArchimed.forEach((user) => jidsToDelete.add(user.userId));
          } else {
            // prettier-ignore
            const targets = input.split(',').map((num) => formatUserId(num.trim())).filter(Boolean);
            targets.forEach((jid) => jidsToDelete.add(jid));
          }
        }
        if (jidsToDelete.size === 0) {
          return await sReply('Tidak ada target yang valid. Gunakan @mention, reply pesan, atau aturan nomor (misal: 1-5).');
        }
        let successCount = 0;
        const finalJids = Array.from(jidsToDelete);
        const deletedMentions = [];
        for (const jid of finalJids) {
          const result = await userModelMethods.remove(jid);
          if (result.modifiedCount > 0) {
            successCount++;
            deletedMentions.push(jid);
          }
        }
        if (successCount > 0) {
          let replyText = `Berhasil menghapus akses *${capitalizedType}* dari *${successCount}* pengguna:\n\n`;
          replyText += deletedMentions.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`).join('\n');
          await sReply(replyText, { mentions: deletedMentions });
        } else {
          return await sReply('Tidak ada pengguna yang dihapus. Periksa kembali target Anda.');
        }
      };
      const subCmd = args[0]?.toLowerCase();
      if (!subCmd) {
        // prettier-ignore
        const guideMessage = `*❏ PANDUAN PERINTAH ${capitalizedType} ❏*\n\n` +
          `*1. Menambah:*\n\`\`\`${dbSettings.rname}${type.toLowerCase()} add <@user/nomor> <durasi>\`\`\`\n\n` +
          `*2. Menghapus:*\n\`\`\`${dbSettings.rname}${type.toLowerCase()} del <@user/nomor>\`\`\`\n\n` +
          `*3. Melihat Daftar:*\n\`\`\`${dbSettings.rname}${type.toLowerCase()} list\`\`\``;
        return sReply(guideMessage);
      }
      switch (subCmd) {
        case 'add': {
          const targetStr = mentionedJidList[0] || args[1];
          const durationStr = args[2];
          const targetJid = formatUserId(targetStr);
          if (!targetJid) return await sReply('User tidak valid. Gunakan @mention atau nomor telepon.');
          await handleAddUser(targetJid, durationStr);
          break;
        }
        case 'del': {
          const input = args.slice(1).join(' ').trim();
          await handleDeleteUser(input);
          break;
        }
        case 'list': {
          await handleListUsers();
          break;
        }
        default:
          return await sReply(`Sub-perintah '${subCmd}' tidak valid. Gunakan 'add', 'del', atau 'list'.`);
      }
    }
  };
}
