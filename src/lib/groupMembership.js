// ─── Info ────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/lib/groupMembership.js ─────────────

import dayjs from '../utils/dayjs.js';
import { Whitelist } from '../../database/index.js';
import { formatDuration, formatDurationMessage } from '../function/index.js';

export function membershipGroup(config) {
  const { type, aliases } = config;
  const capitalizedType = type.toUpperCase();
  return {
    name: type.toLowerCase(),
    category: 'owner',
    description: `Mengelola hak akses ${type} untuk grup.`,
    aliases: aliases,
    isCommandWithoutPayment: true,
    execute: async ({ fn, m, sReply, args, dbSettings, store }) => {
      const handleAddGroup = async (groupId, durationStr) => {
        let durationMs = null;
        if (durationStr) {
          if (!/^\d+[smhdwyM]$/i.test(durationStr)) {
            return await sReply('Format durasi tidak valid. Contoh: 30d atau tanpa durasi untuk permanen');
          }
          const duration = formatDuration(durationStr);
          durationMs = duration.asMilliseconds();
          if (durationMs <= 0) return await sReply('Durasi harus lebih dari 0');
        }
        await Whitelist.addToWhitelist(groupId, durationMs);
        let groupName = 'Unknown Group';
        try {
          const metadata = await store.getGroupMetadata(groupId);
          groupName = metadata?.subject || groupName;
        } catch {
          groupName = groupId;
        }
        if (durationMs) {
          const duration = formatDuration(durationStr);
          const durationMessage = formatDurationMessage(duration);
          // prettier-ignore
          return await sReply(
            `*PENAMBAHAN ${capitalizedType}*\n\n` +
            `Grup: ${groupName}\n` +
            `ID: ${groupId}\n` +
            `${durationMessage}`
          );
        }
        // prettier-ignore
        await sReply(
          `*PENAMBAHAN ${capitalizedType}*\n\n` +
          `Grup: ${groupName}\n` +
          `ID: ${groupId}\n` +
          `Status: Permanen`
        );
      };
      const handleListGroups = async () => {
        const groups = await Whitelist.getWhitelistedGroups();
        if (groups.length === 0) {
          return await sReply(`Tidak ada grup ${type} aktif saat ini.`);
        }
        const activeGroups = groups.filter((g) => {
          if (!g.expiredAt) return true;
          return g.expiredAt > new Date();
        });
        const expiredGroups = groups.filter((g) => {
          if (!g.expiredAt) return false;
          return g.expiredAt <= new Date();
        });
        let listText = `*Daftar Grup ${capitalizedType}*\n`;
        if (activeGroups.length > 0) {
          listText += `*Aktif (${activeGroups.length}):*\n`;
          activeGroups.sort((a, b) => {
            if (!a.expiredAt) return -1;
            if (!b.expiredAt) return 1;
            return b.expiredAt - a.expiredAt;
          });
          for (let i = 0; i < activeGroups.length; i++) {
            const group = activeGroups[i];
            let groupName = 'Unknown Group';
            try {
              const metadata = await store.getGroupMetadata(group.groupId);
              groupName = metadata?.subject || groupName;
            } catch {
              groupName = group.groupId;
            }
            listText += `\n${i + 1}. ${groupName}\n`;
            if (group.expiredAt) {
              const expiredDate = dayjs(group.expiredAt);
              const now = dayjs();
              const days = Math.ceil(expiredDate.diff(now, 'day', true));
              listText += `Sisa: ${days} hari\n`;
            } else {
              listText += `Status: Permanen\n`;
            }
          }
        }
        if (expiredGroups.length > 0) {
          listText += `\n*Expired (${expiredGroups.length}):*\n`;
          for (let i = 0; i < expiredGroups.length; i++) {
            const group = expiredGroups[i];
            let groupName = 'Unknown Group';
            try {
              const metadata = await store.getGroupMetadata(group.groupId);
              groupName = metadata?.subject || groupName;
            } catch {
              groupName = group.groupId;
            }
            listText += `\n${i + 1}. ${groupName}\n`;
            listText += `Status: Expired\n`;
          }
        }
        await sReply(listText);
      };
      const handleDeleteGroup = async (input) => {
        let groupId = null;
        if (input && input.includes('@g.us')) {
          groupId = input.trim();
        } else if (input && input.match(/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/i)) {
          const inviteCode = input.split('https://chat.whatsapp.com/')[1];
          const { id } = await fn.groupGetInviteInfo(inviteCode);
          groupId = id;
        } else if (m.isGroup) {
          groupId = m.key.remoteJid;
        } else {
          return await sReply('Target tidak valid. Gunakan ID grup (@g.us), link grup, atau jalankan di dalam grup.');
        }
        const result = await Whitelist.removeFromWhitelist(groupId);
        if (result.deletedCount > 0) {
          let groupName = 'Unknown Group';
          try {
            const metadata = await store.getGroupMetadata(groupId);
            groupName = metadata?.subject || groupName;
          } catch {
            groupName = groupId;
          }
          await sReply(`Berhasil menghapus akses ${capitalizedType} dari grup:\n\n${groupName}\nID: ${groupId}`);
        } else {
          return await sReply('Grup tidak ditemukan dalam daftar whitelist.');
        }
      };
      const handleResetAll = async () => {
        await Whitelist.clearAll();
        await sReply(`Semua grup ${capitalizedType} telah dihapus dari daftar.`);
      };
      const subCmd = args[0]?.toLowerCase();
      if (args.length === 0 || !['add', 'del', 'list', 'reset'].includes(subCmd)) {
        // prettier-ignore
        const guideMessage =
          `*PANDUAN PERINTAH ${capitalizedType}*\n\n` +
          `1. Menambah (Permanen):\n` +
          `${dbSettings.rname}${type.toLowerCase()} add (di dalam grup)\n` +
          `${dbSettings.rname}${type.toLowerCase()} add <link_grup>\n` +
          `${dbSettings.rname}${type.toLowerCase()} add <id_grup@g.us>\n\n` +
          `2. Menambah (Temporary):\n` +
          `${dbSettings.rname}${type.toLowerCase()} add <target> <durasi>\n` +
          `Contoh: ${dbSettings.rname}${type.toLowerCase()} add 30d\n\n` +
          `3. Menghapus:\n` +
          `${dbSettings.rname}${type.toLowerCase()} del (di dalam grup)\n` +
          `${dbSettings.rname}${type.toLowerCase()} del <id_grup@g.us>\n\n` +
          `4. Melihat Daftar:\n` +
          `${dbSettings.rname}${type.toLowerCase()} list\n\n` +
          `5. Reset Semua:\n` +
          `${dbSettings.rname}${type.toLowerCase()} reset`;
        return sReply(guideMessage);
      }
      switch (subCmd) {
        case 'add': {
          let groupId = null;
          let durationStr = null;
          const target = args[1];
          const duration = args[2];
          if (target && target.includes('@g.us')) {
            groupId = target;
            durationStr = duration;
          } else if (target && target.match(/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/i)) {
            const inviteCode = target.split('https://chat.whatsapp.com/')[1];
            const { id } = await fn.groupGetInviteInfo(inviteCode);
            groupId = id;
            durationStr = duration;
          } else if (m.isGroup) {
            groupId = m.key.remoteJid;
            durationStr = target;
          } else {
            return await sReply('Perintah whitelist add tanpa target hanya bisa digunakan di dalam grup.');
          }
          await handleAddGroup(groupId, durationStr);
          break;
        }
        case 'del': {
          const input = args.slice(1).join(' ').trim();
          await handleDeleteGroup(input);
          break;
        }
        case 'list': {
          await handleListGroups();
          break;
        }
        case 'reset': {
          await handleResetAll();
          break;
        }
        default:
          return await sReply(`Sub-perintah '${subCmd}' tidak valid. Gunakan 'add', 'del', 'list', atau 'reset'.`);
      }
    }
  };
}
