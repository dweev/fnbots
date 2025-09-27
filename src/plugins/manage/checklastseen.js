// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { StoreMessages } from '../../../database/index.js';
import { formatTimeAgo } from '../../lib/function.js';

export const command = {
  name: 'checklastseen',
  category: 'manage',
  description: 'Memeriksa kapan terakhir kali anggota grup terlihat aktif.',
  aliases: ['lastseen'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, sReply }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di dalam grup.');
    const chatData = await StoreMessages.findOne({ chatId: toId }).select('presences').lean();
    if (!chatData || !chatData.presences || Object.keys(chatData.presences).length === 0) return await sReply('Tidak ada data kehadiran yang tercatat untuk grup ini.');
    const presences = chatData.presences;
    const seenList = Object.entries(presences)
      .filter(([, data]) => data?.whatsapp?.net?.lastSeen)
      .sort(([, a], [, b]) => b.whatsapp.net.lastSeen - a.whatsapp.net.lastSeen);
    if (seenList.length === 0) return await sReply('Tidak ada data kehadiran yang valid yang bisa ditampilkan.');
    const resultText = `*Aktivitas Terakhir Anggota Grup:*\n\n` +
      seenList.map(([jid, data], i) => {
        const timeAgo = formatTimeAgo(data.whatsapp.net.lastSeen);
        return `${i + 1}. @${jid.split('@')[0]} - ${timeAgo}`;
      }).join('\n');
    await sReply(resultText);
  }
};