// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { delay } from 'baileys';
import log from '../../lib/logger.js';
import config from '../../../config.js';
import { StoreGroupMetadata, Whitelist } from '../../../database/index.js';

export const command = {
  name: 'broadcast',
  category: 'owner',
  description: 'Mengirim pesan siaran ke grup yang ada di whitelist atau tidak.',
  aliases: ['bc'],
  isCommandWithoutPayment: true,
  execute: async ({ args, dbSettings, fn, sReply }) => {
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
    const allGroupMetadatas = await StoreGroupMetadata.find({}).select('groupId').lean();
    const allGroupIds = allGroupMetadatas.map(g => g.groupId);
    const whitelistedGroups = await Whitelist.find({ type: 'group' }).select('targetId').lean();
    const whitelistIdSet = new Set(whitelistedGroups.map(w => w.targetId));
    let targetGroups;
    if (broadcastMode === 'whitelist') {
      targetGroups = allGroupIds.filter(id => whitelistIdSet.has(id));
    } else if (broadcastMode === 'nonwhitelist') {
      targetGroups = allGroupIds.filter(id => !whitelistIdSet.has(id));
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
        if (whitelistIdSet.has(idGroup)) {
          const caption = `*${dbSettings.botName} Broadcast*\n\n${messageContent}`;
          const res = await fn.groupMetadata(idGroup);
          await fn.sendFilePath(idGroup, caption, config.paths.avatar, { ephemeralExpiration: res.ephemeralDuration });
        } else {
          const res = await fn.groupMetadata(idGroup);
          await fn.sendPesan(idGroup, messageContent, { ephemeralExpiration: res.ephemeralDuration });
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