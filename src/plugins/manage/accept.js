// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { parseSelector } from '../../function/function.js';
import { mongoStore } from '../../../database/index.js';

export const command = {
  name: 'accept',
  category: 'manage',
  description: 'menerima permintaan masuk group dari calon member',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, isBotGroupAdmins, dbSettings, toId, args }) => {
    if (m.isGroup && isBotGroupAdmins) {
      const pendingList = await fn.groupRequestParticipantsList(toId).then(a => a.map(b => b.jid));
      if (pendingList.length === 0) {
        return await sReply('Saat ini tidak ada permintaan bergabung yang tertunda.');
      }
      const selector = args[0];
      if (!selector) {
        const listPromises = pendingList.map(async (p, index) => {
          let jid;
          if (p.endsWith('@lid')) {
            jid = await mongoStore.findJidByLid(p);
          } else {
            jid = p;
          }
          return `${index + 1}. @${(jid)?.split('@')[0]}`;
        });
        const listText = (await Promise.all(listPromises)).join('\n');
        return await sReply(
          `*Daftar Permintaan Bergabung:*\n${listText}\n\n` +
          `*Cara penggunaan:*\n` +
          `• ${dbSettings.rname}accept all\n` +
          `• ${dbSettings.rname}accept 1,3,5\n` +
          `• ${dbSettings.rname}accept 1-5\n` +
          `• ${dbSettings.rname}accept >3\n` +
          `• ${dbSettings.rname}accept <3\n` +
          `• ${dbSettings.rname}accept 628xxx@s.whatsapp.net`
        );
      }
      const fullSelector = args.join(' ').trim();
      const jidsToApprove = parseSelector(fullSelector, pendingList);
      if (jidsToApprove.length === 0) {
        return await sReply(`Tidak ada JID yang valid ditemukan dari input: "${fullSelector}"\n\nPending list: ${pendingList.length} orang`);
      }
      await fn.groupRequestParticipantsUpdate(toId, jidsToApprove, 'approve');
      let mentionParts = [];
      for (const lid of jidsToApprove) {
        let jid;
        if (lid.endsWith('@lid')) {
          jid = await mongoStore.findJidByLid(lid);
        } else {
          jid = lid;
        }
        const numberToMention = jid?.split('@')[0];
        mentionParts.push(`@${numberToMention}`);
      }
      const approvedText = mentionParts.join(', ');
      await sReply(`Berhasil menyetujui ${jidsToApprove.length} permintaan:\n${approvedText}`);
    }
  }
};