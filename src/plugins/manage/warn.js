// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Group } from '../../../database/index.js';

export const command = {
  name: 'warn',
  category: 'manage',
  description: 'Memberi peringatan kepada anggota grup dan mengeluarkannya jika melewati batas.',
  aliases: ['warning'],
  execute: async ({ fn, m, toId, sReply, ar, quotedMsg, mentionedJidList, quotedParticipant, arg, dbSettings }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di grup!');
    if (!arg) return await sReply(`Gagal. Balas atau mention pengguna untuk memberi peringatan, atau gunakan ${dbSettings.rname}warn set on/off untuk mengatur fitur.`);
    const metadata = await fn.groupMetadata(toId);
    const groupAdmins = metadata?.participants?.filter(p => p.admin).map(p => p.id) || [];
    const group = await Group.ensureGroup(toId);
    const subCommand = ar[0]?.toLowerCase();
    if (subCommand === 'set') {
      const action = ar[1]?.toLowerCase();
      const limit = parseInt(ar[2], 10) || 5;
      if (action !== 'on' && action !== 'off') return await sReply(`Gunakan: ${dbSettings.rname}warn set on [jumlah] atau ${dbSettings.rname}warn set off`);
      if (limit < 1 || limit > 10) return await sReply('Batas peringatan harus antara 1-10!');
      await group.setWarningState(action === 'on');
      await group.setWarningLimit(limit);
      await sReply(`Fitur auto-kick setelah ${limit} kali warning telah diatur ke: ${action.toUpperCase()}`);
      return;
    }
    let targets = [];
    if (quotedMsg) {
      targets.push(quotedParticipant);
    }
    if (mentionedJidList.length > 0) {
      targets = [...targets, ...mentionedJidList];
    }
    targets = [...new Set(targets.filter(Boolean))];
    if (targets.length === 0) return await sReply('Tidak ada pengguna yang dituju untuk peringatan.');
    const isAutoKickActive = group.isWarningEnabled();
    const kickThreshold = group.getWarningLimit();
    let warnedUsers = [];
    let failedAdmins = [];
    let failedBots = [];
    for (const userId of targets) {
      if (userId.includes(fn.user.id)) {
        failedBots.push(userId);
        continue;
      }
      if (groupAdmins.includes(userId)) {
        failedAdmins.push(userId);
        continue;
      }
      await group.addWarning(userId);
      const newCount = group.getWarnings(userId);
      warnedUsers.push({ id: userId, count: newCount });
      if (isAutoKickActive && newCount >= kickThreshold) {
        await sReply(`Peringatan Terakhir!\n\n@${userId.split('@')[0]} telah mencapai batas ${kickThreshold} peringatan dan akan dikeluarkan.`, [userId]);
        await fn.removeParticipant(toId, userId);
        await group.resetWarnings(userId);
      }
    }
    let replyText = '';
    if (warnedUsers.length > 0) {
      const successList = warnedUsers
        .map(u => `› @${u.id.split('@')[0]} Total: ${u.count}`)
        .join('\n');
      replyText += `Peringatan Diberikan:\n${successList}`;
    }
    if (failedAdmins.length > 0) {
      const adminList = failedAdmins.map(id => `› @${id.split('@')[0]}`).join('\n');
      replyText += `\n\nGagal memberi peringatan kepada admin:\n${adminList}`;
    }
    if (failedBots.length > 0) {
      replyText += `\n\nTidak dapat memberi peringatan kepada bot.`;
    }
    if (replyText) await sReply(replyText);
  }
};
