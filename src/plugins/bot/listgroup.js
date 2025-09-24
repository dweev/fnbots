// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { updateMyGroup } from '../../../core/handler.js';
import { StoreGroupMetadata } from '../../../database/index.js';

export const command = {
  name: 'listgroup',
  category: 'bot',
  description: 'Menampilkan daftar semua grup dan memperbarui cache untuk remote command.',
  aliases: ['lg', 'grouplist', 'mygroup'],
  execute: async ({ sReply }) => {
    const allGroups = await StoreGroupMetadata.find({}, { groupId: 1, subject: 1, _id: 0 }).lean();
    if (!allGroups || allGroups.length === 0) return sReply('Bot tidak berada di dalam grup manapun saat ini.');
    allGroups.sort((a, b) => a.subject.localeCompare(b.subject));
    const groupJids = allGroups.map(g => g.groupId);
    updateMyGroup(groupJids);
    let replyText = `*Daftar Grup (${allGroups.length})*\n\n`;
    replyText += allGroups.map((group, index) => {
      return `${index + 1}. *${group.subject}*\n   - ID: ${group.groupId}`;
    }).join('\n\n');
    replyText += `\n\nCache untuk remote command berhasil diperbarui.`;
    await sReply(replyText);
  }
};