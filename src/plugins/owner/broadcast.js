// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import log from '../../lib/logger.js';
import config from '../../../config.js';
import { delay } from '../../function/index.js';
import { performanceManager } from '../../lib/performanceManager.js';

export const command = {
  name: 'broadcast',
  category: 'owner',
  description: 'Mengirim pesan siaran ke grup yang ada di whitelist atau tidak.',
  aliases: ['bc'],
  isCommandWithoutPayment: true,
  execute: async ({ args, dbSettings, fn, sReply, m, store }) => {
    let broadcastMode = 'all';
    let messageContent = args.join(' ');
    const firstArg = args[0]?.toLowerCase();
    if (firstArg === '--whitelist') {
      broadcastMode = 'whitelist';
      messageContent = args.slice(1).join(' ');
    } else if (firstArg === '--nonwhitelist') {
      broadcastMode = 'nonwhitelist';
      messageContent = args.slice(1).join(' ');
    }
    if (!messageContent) {
      // prettier-ignore
      return await sReply(
        `Masukkan pesan untuk broadcast.\n\n` +
        `*Penggunaan:*\n` +
        `1. ${dbSettings.rname}broadcast [pesan]\n` +
        `   (Kirim ke SEMUA grup)\n\n` +
        `2. ${dbSettings.rname}broadcast --whitelist [pesan]\n` +
        `   (Kirim HANYA ke grup whitelist)\n\n` +
        `3. ${dbSettings.rname}broadcast --nonwhitelist [pesan]\n` +
        `   (Kirim HANYA ke grup non-whitelist)`
      );
    }
    const allGroupMetadatas = await store.getAllGroups({ groupId: 1 });
    const allGroupIds = allGroupMetadatas.map((g) => g.groupId);
    const whitelistIdSet = new Set();
    for (const id of allGroupIds) {
      if (await performanceManager.cache.warmWhitelistCache(id)) {
        whitelistIdSet.add(id);
      }
    }
    let targetGroups;
    if (broadcastMode === 'whitelist') {
      targetGroups = allGroupIds.filter((id) => whitelistIdSet.has(id));
    } else if (broadcastMode === 'nonwhitelist') {
      targetGroups = allGroupIds.filter((id) => !whitelistIdSet.has(id));
    } else {
      targetGroups = allGroupIds;
    }
    if (targetGroups.length === 0) {
      return await sReply('Tidak ada grup target yang ditemukan untuk mode ini.');
    }
    await sReply(`Memulai broadcast ${broadcastMode} ke ${targetGroups.length} grup...`);
    let successCount = 0;
    let failedCount = 0;
    for (const idGroup of targetGroups) {
      try {
        const groupInfo = await store.getGroupMetadata(idGroup);
        const expiration = groupInfo?.ephemeralDuration || 0;
        if (whitelistIdSet.has(idGroup)) {
          const caption = `*${dbSettings.botName} Broadcast*\n\n${messageContent}`;
          await fn.sendFilePath(idGroup, caption, config.paths.avatar, { quoted: m, ephemeralExpiration: expiration });
        } else {
          await fn.sendPesan(idGroup, messageContent, { ephemeralExpiration: expiration });
        }
        successCount++;
        await delay(1500);
      } catch (error) {
        failedCount++;
        await log(`Gagal broadcast ke ${idGroup}: ${error.message}`, true);
      }
    }
    await sReply(`Broadcast selesai.\n\n- Berhasil terkirim: *${successCount}* grup\n- Gagal terkirim: *${failedCount}* grup`);
  }
};
