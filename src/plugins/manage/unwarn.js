// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'unwarn',
  category: 'manage',
  description: 'Mengurangi peringatan anggota grup.',
  aliases: ['unwarning'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, sReply, quotedMsg, mentionedJidList, quotedParticipant, store }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di dalam grup!');
    const metadata = await store.getGroupMetadata(toId);
    const groupAdmins = metadata?.participants?.filter((p) => p.admin).map((p) => p.id) || [];
    if (!groupAdmins.includes(m.sender)) return await sReply('Hanya admin yang dapat menggunakan perintah ini!');
    let targets = [];
    if (quotedMsg) targets.push(quotedParticipant);
    if (mentionedJidList.length > 0) targets.push(...mentionedJidList);
    targets = [...new Set(targets.filter(Boolean))];
    if (targets.length === 0) return await sReply('Balas atau mention pengguna untuk mengurangi peringatan.');
    const group = await Group.ensureGroup(toId);
    const unwarned = [];
    const noWarning = [];
    for (const userId of targets) {
      const currentWarnings = group.getWarnings(userId);
      if (currentWarnings === 0) {
        noWarning.push(userId);
      } else {
        const newCount = group.decrementWarning(userId);
        unwarned.push({ id: userId, count: newCount });
      }
    }
    await group.save();
    let reply = '';
    if (unwarned.length) {
      reply += `Peringatan dikurangi:\n${unwarned.map((u) => `› @${u.id.split('@')[0]} Sisa: ${u.count}`).join('\n')}`;
    }
    if (noWarning.length) {
      reply += `${reply ? '\n\n' : ''}Tidak ada peringatan:\n${noWarning.map((id) => `› @${id.split('@')[0]}`).join('\n')}`;
    }
    await sReply(reply || 'Tidak ada perubahan yang dilakukan.');
  }
};
