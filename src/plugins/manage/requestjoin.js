// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { store } from '../../../database/index.js';

export const command = {
  name: 'requestjoin',
  category: 'manage',
  description: 'melihat permintaan masuk group',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, isBotGroupAdmins, dbSettings, toId }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan didalam group.`);
    if (!isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    const pendingList = await fn.groupRequestParticipantsList(toId).then(a => a.map(b => b.jid));
    if (pendingList.length > 0) {
      const listPromises = pendingList.map(async (p, index) => {
        let jid;
        if (p.endsWith('@lid')) {
          jid = await store.findJidByLid(p);
        } else {
          jid = p;
        }
        return `${index + 1}. @${(jid).split('@')[0]}`;
      });
      const listText = (await Promise.all(listPromises)).join('\n');
      await sReply(`*Daftar Permintaan Bergabung yang Tertunda:*\n\n${listText}\n\nUntuk menyetujui, gunakan perintah *${dbSettings.rname}accept nomor urut*.`);
    } else {
      await sReply('Saat ini tidak ada permintaan bergabung yang tertunda.');
    }
  }
};