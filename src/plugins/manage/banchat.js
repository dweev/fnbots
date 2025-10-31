// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';
import { performanceManager } from '../../lib/performanceManager.js';

export const command = {
  name: 'banchat',
  category: 'manage',
  description: 'Matikan/aktifkan bot di group',
  isCommandWithoutPayment: true,
  execute: async ({ m, args, sReply, toId, dbSettings, reactDone, isSadmin, isMaster, store }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan didalam group.`);
    const group = await performanceManager.cache.warmGroupSettingsCache(toId);
    if (!group) return await sReply('Gagal memuat data group.');
    const status = args[0]?.toLowerCase();
    switch (status) {
      case 'on':
        if (group.isMuted) return sReply(`Chat ini sudah dimatikan notifikasinya.\n\nGunakan ${dbSettings.rname}banchat off untuk mengaktifkan kembali notifikasi.`);
        await group.muteChat();
        await group.save();
        performanceManager.cache.invalidateGroupDataCache(toId);
        await reactDone();
        await sReply(`Chat berhasil dimatikan.`);
        break;
      case 'off':
        if (!group.isMuted) return sReply(`Chat ini belum dimatikan notifikasinya.\n\nGunakan ${dbSettings.rname}banchat on untuk mematikan notifikasi.`);
        await group.unmuteChat();
        await group.save();
        performanceManager.cache.invalidateGroupDataCache(toId);
        await reactDone();
        await sReply(`Chat berhasil diaktifkan.`);
        break;
      case 'list': {
        if (!isSadmin && !isMaster) return;
        const mutedGroups = await Group.find({ isMuted: true }).select('groupId groupName memberCount');
        if (mutedGroups.length === 0) return sReply('Tidak ada group yang dimatikan saat ini.');
        let message = `*LIST GROUP YANG DIMATIKAN*\n`;
        message += `Total: ${mutedGroups.length} group\n\n`;
        for (let i = 0; i < mutedGroups.length; i++) {
          const groupId = mutedGroups[i].groupId;
          let groupInfo = {
            name: mutedGroups[i].groupName || 'Unknown',
            memberCount: mutedGroups[i].memberCount || 0,
            isAnnounce: false,
            isRestrict: false
          };
          try {
            const metadata = await store.getGroupMetadata(groupId);
            if (metadata) {
              groupInfo = {
                name: metadata.subject || groupInfo.name,
                memberCount: metadata.size || groupInfo.memberCount,
                isAnnounce: metadata.announce || false,
                isRestrict: metadata.restrict || false
              };
            }
          } catch {
            // Do nothing
          }
          message += `${i + 1}. *${groupInfo.name}*\n`;
          message += `   👥 Members: ${groupInfo.memberCount}\n`;
          const statusArr = [];
          if (groupInfo.isAnnounce) statusArr.push('Only Admin');
          if (groupInfo.isRestrict) statusArr.push('Locked');
          if (statusArr.length > 0) {
            message += `   Status: ${statusArr.join(', ')}\n`;
          }
          message += `\n`;
        }
        message += `\nGunakan ${dbSettings.rname}banchat reset untuk mereset semua.`;
        await sReply(message);
        break;
      }
      case 'reset': {
        if (!isSadmin && !isMaster) return;
        const mutedGroups = await Group.find({ isMuted: true });
        let successCount = 0;
        for (const mutedGroup of mutedGroups) {
          try {
            await mutedGroup.unmuteChat();
            await mutedGroup.save();
            performanceManager.cache.invalidateGroupDataCache(mutedGroup.groupId);
            successCount++;
          } catch (error) {
            console.error(`Failed to unmute ${mutedGroup.groupId}:`, error);
          }
        }
        await reactDone();
        await sReply(`Semua chat yang dimatikan telah direset (${successCount}/${mutedGroups.length} group berhasil).`);
        break;
      }
      default: {
        let message = `*BANCHAT COMMANDS*\n\n`;
        message += `${dbSettings.rname}banchat on\n`;
        message += `└ Menonaktifkan bot di group ini\n\n`;
        message += `${dbSettings.rname}banchat off\n`;
        message += `└ Mengaktifkan bot di group ini\n\n`;
        message += `${dbSettings.rname}banchat list\n`;
        message += `└ Lihat daftar group yang dimatikan\n\n`;
        if (isSadmin || isMaster) {
          message += `${dbSettings.rname}banchat reset\n`;
          message += `└ Reset semua pengaturan banchat`;
        }
        await sReply(message);
      }
    }
  }
};
