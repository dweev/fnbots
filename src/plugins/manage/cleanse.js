// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { delay } from 'baileys';
import log from '../../lib/logger.js';
import { User } from '../../../database/index.js';

export const command = {
  name: 'cleanse',
  category: 'manage',
  description: 'Mengeluarkan semua anggota grup yang bukan admin atau tidak memiliki status khusus (Master/VIP/Premium).',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, sReply, isBotGroupAdmins, botNumber, ownerNumber, store }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di dalam grup.');
    if (!isBotGroupAdmins) return await sReply('Bot harus menjadi admin untuk menjalankan perintah ini.');
    const groupMetadata = await store.getGroupMetadata(toId);
    const allMemberIds = groupMetadata.participants.map((p) => p.id);
    const groupAdminIds = new Set(groupMetadata.participants.filter((p) => p.admin).map((p) => p.id));
    const specialUsers = await User.find({
      userId: { $in: allMemberIds },
      $or: [{ isMaster: true }, { isVIP: true }, { isPremium: true }]
    })
      .select('userId')
      .lean();
    const specialUserIds = new Set(specialUsers.map((u) => u.userId));
    let removedCount = 0;
    let failedCount = 0;
    for (const memberId of allMemberIds) {
      const isOwner = ownerNumber.includes(memberId);
      const isBot = memberId === botNumber;
      const isAdmin = groupAdminIds.has(memberId);
      const isSpecial = specialUserIds.has(memberId);
      if (isBot || isOwner || isAdmin || isSpecial) {
        continue;
      }
      try {
        await fn.removeParticipant(toId, memberId);
        removedCount++;
        await delay(1000);
      } catch (error) {
        failedCount++;
        await log(`Gagal mengeluarkan ${memberId}: ${error.message}`, true);
      }
    }
    await sReply(`Proses pembersihan selesai.\n\n- Berhasil dikeluarkan: *${removedCount}* anggota\n- Gagal: *${failedCount}*`);
  }
};
