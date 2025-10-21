import { jidNormalizedUser } from 'baileys';
import { updateMyGroup } from '../../../core/handler.js';

export const command = {
  name: 'listgroup',
  category: 'list',
  description: 'Menampilkan daftar semua grup dan memperbarui cache untuk remote command.',
  aliases: ['lg', 'grouplist', 'mygroup'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, isMaster, store }) => {
    if (!(isSadmin || isMaster)) return;
    const allGroups = await store.getAllGroups({ groupId: 1, subject: 1, participants: 1 });
    if (!allGroups || allGroups.length === 0) return sReply('Bot tidak berada di dalam grup manapun saat ini.');
    allGroups.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
    const groupJids = [];
    const groupMembers = {};
    allGroups.forEach(group => {
      groupJids.push(group.groupId);
      if (group.participants) {
        groupMembers[group.groupId] = group.participants.map(p => ({
          id: jidNormalizedUser(p.id),
          admin: p.admin === 'admin' || p.admin === 'superadmin',
        }));
      }
    });
    updateMyGroup(groupJids, groupMembers);
    let replyText = `*Daftar Grup (${allGroups.length})*\n\n`;
    replyText += allGroups.map((group, index) => {
      return `${index + 1}. *${group.subject}*\n   - ID: ${group.groupId}`;
    }).join('\n\n');
    replyText += `\n\nCache untuk remote command (${groupJids.length} grup) berhasil diperbarui.`;
    await sReply(replyText);
  }
};