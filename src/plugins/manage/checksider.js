// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { formatTimeAgo } from '../../function/index.js';

export const command = {
  name: 'checksider',
  category: 'manage',
  description: 'Menampilkan laporan aktivitas sider anggota grup.',
  aliases: ['listsider'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, sReply, store }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di dalam grup.');
    const groupMetadata = await store.getGroupMetadata(toId);
    const messages = await store.getMessages(toId, 1000);
    const presences = await store.getPresences(toId);
    if (!groupMetadata?.participants) return await sReply('Gagal mendapatkan data anggota grup.');
    const participants = groupMetadata.participants;
    const messageCount = {};
    messages.forEach((msg) => {
      if (msg.sender && participants.some((p) => p.id === msg.sender)) {
        messageCount[msg.sender] = (messageCount[msg.sender] || 0) + 1;
      }
    });
    const activityList = participants.map((p) => {
      const jid = p.id;
      return {
        id: jid,
        msgCount: messageCount[jid] || 0,
        lastSeen: presences[jid]?.lastSeen || 0
      };
    });
    const inactiveUsers = activityList.filter((user) => user.msgCount === 0);
    inactiveUsers.sort((a, b) => a.lastSeen - b.lastSeen);
    if (!inactiveUsers.length) return await sReply('Tidak ada anggota yang belum mengirim pesan sama sekali.');
    const resultText =
      `*Daftar Anggota Non-Aktif (Sider):*\n_${groupMetadata.subject}_\n\n` +
      `Total: ${inactiveUsers.length} anggota\n\n` +
      inactiveUsers
        .map((user, i) => {
          const timeAgo = user.lastSeen ? formatTimeAgo(user.lastSeen) : 'tidak pernah online';
          return `${i + 1}. @${user.id.split('@')[0]}\n   - Terakhir Dilihat: ${timeAgo}`;
        })
        .join('\n\n');
    await sReply(resultText);
  }
};
