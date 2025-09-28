// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatTimeAgo } from '../../function/function.js';
import { StoreMessages, mongoStore } from '../../../database/index.js';

export const command = {
  name: 'checkactivity',
  category: 'manage',
  description: 'Menampilkan laporan aktivitas semua anggota grup.',
  aliases: ['listmember'],
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
    for (const msg of messages) {
      if (msg.sender && participants.some(p => p.id === msg.sender)) {
        messageCount[msg.sender] = (messageCount[msg.sender] || 0) + 1;
      }
    }
    let activityList = participants.map(p => {
      const shortJid = p.id.replace('@s.whatsapp.net', '@s');
      return {
        id: p.id,
        msgCount: messageCount[p.id] || 0,
        lastSeen: presences[shortJid]?.whatsapp?.net?.lastSeen || 0
      };
    });
    activityList.sort((a, b) => b.msgCount - a.msgCount);
    const resultText = `*Laporan Aktivitas Grup*\n_${groupMetadata.subject}_\n\n` +
      activityList.map((user, i) => {
        const timeAgo = user.lastSeen ? formatTimeAgo(user.lastSeen) : 'tidak terekam';
        return `${i + 1}. @${user.id.split('@')[0]}\n   - Pesan: *${user.msgCount}*\n   - Terakhir Aktif: *${timeAgo}*`;
      }).join('\n\n');
    await sReply(resultText);
  }
};