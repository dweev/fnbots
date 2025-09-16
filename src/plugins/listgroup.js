// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { GroupMetadata, User, Command } from '../../database/index.js';
import { updateMyGroup } from '../utils/handler.js';

export const command = {
  name: 'listgroup',
  category: 'owner',
  description: 'Menampilkan daftar semua grup dan memperbarui cache untuk remote command.',
  aliases: ['lg', 'grouplist', 'mygroup'],
  execute: async ({ m, sReply }) => {
    const allGroups = await GroupMetadata.find({}, { groupId: 1, subject: 1, _id: 0 }).lean();
    if (!allGroups || allGroups.length === 0) {
      return sReply('Bot tidak berada di dalam grup manapun saat ini.');
    }
    allGroups.sort((a, b) => a.subject.localeCompare(b.subject));
    const groupJids = allGroups.map(g => g.groupId);
    updateMyGroup(groupJids);
    let replyText = `*Daftar Grup (${allGroups.length})*\n\n`;
    replyText += allGroups.map((group, index) => {
      return `${index + 1}. *${group.subject}*\n   - ID: ${group.groupId}`;
    }).join('\n\n');
    replyText += `\n\nCache untuk remote command berhasil diperbarui.`;
    await sReply(replyText);
    await Command.findOneAndUpdate({ name: command.name }, { $inc: { count: 1 } }, { upsert: true });
    await User.findOneAndUpdate({ userId: m.sender }, { $inc: { [`commandStats.${command.name}`]: 1 } }, { upsert: true });
  }
};