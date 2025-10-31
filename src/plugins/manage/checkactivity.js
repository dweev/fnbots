// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { formatTimeAgo } from '../../function/index.js';

export const command = {
  name: 'checkactivity',
  category: 'manage',
  description: 'Menampilkan laporan aktivitas semua anggota grup.',
  aliases: ['listmember'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, sReply, store }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di dalam grup.');
    const groupMetadata = await store.getGroupMetadata(toId);
    const messages = await store.getMessages(toId, 1000);
    const presences = await store.getPresences(toId);
    if (!groupMetadata?.participants) return await sReply('Gagal mendapatkan data anggota grup.');
    const participants = groupMetadata.participants;
    const messageCount = {};
    for (const msg of messages) {
      if (msg.sender && participants.some((p) => p.id === msg.sender)) {
        messageCount[msg.sender] = (messageCount[msg.sender] || 0) + 1;
      }
    }
    const activityList = participants.map((p) => {
      const jid = p.id;
      return {
        id: jid,
        msgCount: messageCount[jid] || 0,
        lastSeen: presences[jid]?.lastSeen || 0
      };
    });
    activityList.sort((a, b) => b.msgCount - a.msgCount);
    const resultText =
      `*Laporan Aktivitas Grup*\n_${groupMetadata.subject}_\n\n` +
      activityList
        .map((user, i) => {
          const timeAgo = user.lastSeen ? formatTimeAgo(user.lastSeen) : 'tidak terekam';
          return `${i + 1}. @${user.id.split('@')[0]}\n   - Pesan: *${user.msgCount}*\n   - Terakhir Aktif: *${timeAgo}*`;
        })
        .join('\n\n');
    await sReply(resultText);
  }
};
