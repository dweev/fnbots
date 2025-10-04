import { jidNormalizedUser } from 'baileys';
import { updateMyGroup } from '../../../core/handler.js';
import { StoreGroupMetadata } from '../../../database/index.js';

export const command = {
  name: 'listgroup',
  category: 'list',
  description: 'Menampilkan daftar semua grup dan memperbarui cache untuk remote command.',
  aliases: ['lg', 'grouplist', 'mygroup'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, isMaster }) => {
    if (!(isSadmin || isMaster)) return;
    const allGroups = await StoreGroupMetadata.find({}).lean();
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
    replyText += `\n\nCache untuk remote command (${groupJids.length} grup, ${Object.keys(groupMembers).length} data anggota) berhasil diperbarui.`;
    await sReply(replyText);
  }
};