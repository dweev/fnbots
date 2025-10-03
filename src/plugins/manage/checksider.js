// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatTimeAgo } from '../../function/index.js';
import { StoreMessages, mongoStore } from '../../../database/index.js';

export const command = {
  name: 'checksider',
  category: 'manage',
  description: 'Menampilkan laporan aktivitas sider anggota grup.',
  aliases: ['listsider'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, sReply }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di dalam grup.');
    const groupMetadata = await mongoStore.getGroupMetadata(toId);
    const messagesData = await StoreMessages.findOne({ chatId: toId }).select('messages').lean();
    const presencesData = await StoreMessages.findOne({ chatId: toId }).select('presences').lean();
    if (!groupMetadata?.participants) return await sReply('Gagal mendapatkan data anggota grup.');
    const participants = groupMetadata.participants;
    const messages = messagesData?.messages || [];
    const presences = presencesData?.presences || {};
    const messageCount = {};
    messages.forEach(mes => {
      if (mes.sender && participants.some(p => p.id === mes.sender)) {
        messageCount[mes.sender] = (messageCount[mes.sender] || 0) + 1;
      }
    });
    const activityList = participants.map(p => {
      const shortJid = p.id.replace('@s.whatsapp.net', '@s');
      return {
        id: p.id,
        msgCount: messageCount[p.id] || 0,
        lastSeen: presences[shortJid]?.whatsapp?.net?.lastSeen || 0
      };
    });
    const inactiveUsers = activityList.filter(user => user.msgCount === 0);
    inactiveUsers.sort((a, b) => a.lastSeen - b.lastSeen);
    if (!inactiveUsers.length) return await sReply('Tidak ada anggota yang belum mengirim pesan sama sekali.');
    const resultText = `*Daftar Anggota Non-Aktif:*\n_${groupMetadata.subject}_\n\n` +
      inactiveUsers.map((user, i) => {
        const timeAgo = user.lastSeen ? formatTimeAgo(user.lastSeen) : 'tidak pernah online';
        return `${i + 1}. @${user.id.split('@')[0]}\n   - Terakhir Dilihat: ${timeAgo}`;
      }).join('\n\n');
    await sReply(resultText);
  }
};