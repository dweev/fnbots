// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info userMembership.js ──────────────

import dayjs from '../utils/dayjs.js';
import { User } from '../../database/index.js';
import { formatDuration, formatDurationMessage } from './function.js';

export function membershipUser(config) {
  const { type, aliases } = config;
  const capitalizedType = type.toUpperCase();
  const userModelMethods = {
    add: `add${type}`,
    remove: `remove${type}`,
    findActive: `findActive${type}s`
  };
  return {
    name: type.toLowerCase(),
    category: 'owner',
    description: `Mengelola hak akses ${type} untuk pengguna.`,
    aliases: aliases,
    isCommandWithoutPayment: true,
    execute: async ({ sReply, args, arg, mentionedJidList, dbSettings }) => {
      const validateDuration = (duration) => {
        if (!duration) return sReply('Durasi tidak boleh kosong. Contoh: 7d, 30d, 1M');
        const durationRegex = /^\d+[smhdwyM]$/i;
        if (!durationRegex.test(duration)) return sReply('Format durasi tidak valid. Gunakan: angka + s/m/h/d/w/M/y');
        return true;
      };
      const formatUserId = (input) => {
        if (input.includes('@s.whatsapp.net')) return input;
        if (input.includes('@')) return input;
        return input + '@s.whatsapp.net';
      };
      const handleAddUser = async (userId, duration) => {
        validateDuration(duration);
        const durationParsed = formatDuration(duration);
        const msToAdd = durationParsed.asMilliseconds();
        if (msToAdd <= 0) return await sReply('Durasi harus lebih dari 0');
        await User[userModelMethods.add](userId, msToAdd);
        const durationMessage = formatDurationMessage(durationParsed);
        await sReply(`*「 ${capitalizedType} 」*\n\n*ID*: @${userId.split('@')[0]}\n${durationMessage}`);
      };
      const handleDeleteUser = async (input) => {
        let deleted = 0;
        const processDelete = async (uid) => {
          const result = await User[userModelMethods.remove](uid);
          if (result.modifiedCount > 0) deleted++;
        };
        if (mentionedJidList.length > 0) {
          for (const userId of mentionedJidList) await processDelete(userId);
        } else {
          const targets = input.split(",").map(s => s.trim()).filter(Boolean);
          if (targets.length === 0) return await sReply('Input tidak valid');
          for (const target of targets) {
            if (target.includes('@') || !/^\d+$/.test(target)) {
              await processDelete(formatUserId(target));
            } else {
              const index = parseInt(target, 10);
              if (isNaN(index) || index < 1) return await sReply(`Index '${target}' tidak valid.`);
              const userToFind = await User.find({ [userModelMethods.findActive.replace('findActive', 'is').slice(0, -1)]: true })
                .sort({ createdAt: 1 })
                .skip(index - 1)
                .limit(1)
                .lean();
              if (userToFind && userToFind.length > 0) {
                await processDelete(userToFind[0].userId);
              } else {
                const totalUsers = await User.countDocuments({ [userModelMethods.findActive.replace('findActive', 'is').slice(0, -1)]: true });
                return await sReply(`Index ${index} tidak valid. Range: 1-${totalUsers}`);
              }
            }
          }
        }
        if (deleted > 0) {
          await sReply(`*「 ${capitalizedType} 」*\n\n*Berhasil menghapus*: ${deleted} user`);
        } else {
          await sReply(`*「 ${capitalizedType} 」*\n\nTidak ada user yang dihapus. Periksa input Anda.`);
        }
      };
      const handleListUsers = async () => {
        const users = await User[userModelMethods.findActive]();
        if (users.length === 0) return sReply(`*「 ${capitalizedType} 」*\n\nTidak ada user ${type} aktif saat ini.`);
        let ts = `*## ${dbSettings.botName} ${type} ##*\n`;
        const sortedUsers = users.sort((a, b) => b[`${type.toLowerCase()}Expired`] - a[`${type.toLowerCase()}Expired`]);
        sortedUsers.forEach((user, index) => {
          const expiredDate = dayjs(user[`${type.toLowerCase()}Expired`]);
          const durationLeft = dayjs.duration(expiredDate.diff(dayjs()));
          const durationMessage = formatDurationMessage(durationLeft);
          ts += `\n${index + 1}. @${user.userId.split('@')[0]}\n ${durationMessage}\n`;
        });
        ts += `\nRegards: *${dbSettings.botName}*`;
        await sReply(ts);
      };
      try {
        if (!arg) {
          const guideMessage = `*❏ PANDUAN PERINTAH ${capitalizedType} ❏*\n\n*1. Menambah:*\n\`\`\`${dbSettings.rname}${type.toLowerCase()} add <@user/nomor> <durasi>\`\`\`\n\n*2. Menghapus:*\n\`\`\`${dbSettings.rname}${type.toLowerCase()} del <@user/nomor/index>\`\`\`\n\n*3. Melihat Daftar:*\n\`\`\`${dbSettings.rname}${type.toLowerCase()} list\`\`\``;
          return sReply(guideMessage);
        }
        const subCmd = args[0].toLowerCase();
        const input = arg.split(' ').slice(1).join(' ').trim();
        switch (subCmd) {
          case 'add': {
            const duration = args[2];
            if (!duration) return await sReply(`Durasi tidak boleh kosong. Contoh: ${dbSettings.rname}${type.toLowerCase()} add @user 30d`);
            if (mentionedJidList.length > 0) {
              for (const jid of mentionedJidList) await handleAddUser(jid, duration);
            } else {
              if (!args[1]) return await sReply('User ID tidak boleh kosong');
              await handleAddUser(formatUserId(args[1]), duration);
            }
            break;
          }
          case 'del':
            if (!input) return await sReply(`User tidak boleh kosong. Contoh: ${dbSettings.rname}${type.toLowerCase()} del @user`);
            await handleDeleteUser(input);
            break;
          case 'list':
            await handleListUsers();
            break;
          default:
            return await sReply(`Sub-perintah '${subCmd}' tidak valid. Gunakan 'add', 'del', atau 'list'.`);
        }
      } catch (error) {
        await sReply(`*「 ${capitalizedType} 」*\n\n*Error*: ${error.message}`);
      }
    }
  };
}