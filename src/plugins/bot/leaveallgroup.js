// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { delay } from 'baileys';
import log from '../../lib/logger.js';
import { performanceManager } from '../../lib/performanceManager.js';

export const command = {
  name: 'leaveallgroup',
  category: 'bot',
  description: 'Mengeluarkan bot dari semua grup dengan opsi mode dan teks perpisahan.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, args, toId, sReply, store }) => {
    let mode = 'all';
    let farewellText = '';
    if (args.length > 0) {
      const firstArg = args[0].toLowerCase();
      if (firstArg === '--free') {
        mode = 'free';
        farewellText = args.slice(1).join(' ').trim();
      } else if (firstArg === '--paid' || firstArg === '--whitelist') {
        mode = 'paid';
        farewellText = args.slice(1).join(' ').trim();
      } else {
        farewellText = args.join(' ').trim();
      }
    }
    await sReply(`Mode terdeteksi: *${mode}*. Memulai proses keluar dari grup...`);
    const allGroupMetadatas = await store.getAllGroups({ groupId: 1 });
    const allGroupIds = allGroupMetadatas.map((g) => g.groupId);
    const whitelistIdSet = new Set();
    for (const id of allGroupIds) {
      if (await performanceManager.cache.warmWhitelistCache(id)) {
        whitelistIdSet.add(id);
      }
    }
    let targetGroupIds = [];
    if (mode === 'free') {
      targetGroupIds = allGroupIds.filter((id) => !whitelistIdSet.has(id));
    } else if (mode === 'paid') {
      targetGroupIds = allGroupIds.filter((id) => whitelistIdSet.has(id));
    } else {
      targetGroupIds = allGroupIds;
    }
    if (targetGroupIds.length === 0) {
      return await sReply('Tidak ada grup target yang sesuai dengan mode yang dipilih.');
    }
    let leftCount = 0;
    let failedCount = 0;
    for (const idGroup of targetGroupIds) {
      if (idGroup === toId) continue;
      try {
        if (farewellText) {
          const groupInfo = await store.getGroupMetadata(idGroup);
          const expiration = groupInfo?.ephemeralDuration || 0;
          await fn.sendPesan(idGroup, farewellText, { ephemeralExpiration: expiration });
          await delay(1000);
        }
        await fn.groupLeave(idGroup);
        leftCount++;
        await delay(2000);
      } catch (error) {
        failedCount++;
        await log(`Gagal keluar dari grup ${idGroup}:\n${error}`, true);
      }
    }
    await sReply(`Proses selesai.\n\nBerhasil keluar dari *${leftCount}* grup.\nGagal pada *${failedCount}* grup.`);
  }
};
