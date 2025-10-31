// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { formatTimeAgo } from '../../function/index.js';

export const command = {
  name: 'checklastseen',
  category: 'manage',
  description: 'Memeriksa kapan terakhir kali anggota grup terlihat aktif.',
  aliases: ['lastseen'],
  isCommandWithoutPayment: true,
  execute: async ({ m, toId, sReply, store }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di dalam grup.');
    const presences = await store.getPresences(toId);
    if (!presences || Object.keys(presences).length === 0) return await sReply('Tidak ada data kehadiran yang tercatat untuk grup ini.');
    const seenList = Object.entries(presences)
      .filter(([, data]) => data?.lastSeen)
      .sort(([, a], [, b]) => b.lastSeen - a.lastSeen);
    if (seenList.length === 0) return await sReply('Tidak ada data kehadiran yang valid yang bisa ditampilkan.');
    const resultText =
      `*Aktivitas Terakhir Anggota Grup:*\n\n` +
      seenList
        .map(([jid, data], i) => {
          const timeAgo = formatTimeAgo(data.lastSeen);
          return `${i + 1}. @${jid.split('@')[0]} - ${timeAgo}`;
        })
        .join('\n');
    await sReply(resultText);
  }
};
