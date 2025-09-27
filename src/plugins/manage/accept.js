// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { archimed } from '../../lib/function.js';
import { mongoStore } from '../../../database/index.js';

export const command = {
  name: 'accept',
  category: 'manage',
  description: 'menerima permintaan masuk group dari calon member',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, isBotGroupAdmins, dbSettings, toId, args }) => {
    if (m.isGroup && isBotGroupAdmins) {
      const pendingList = await fn.groupRequestParticipantsList(toId).then(a => a.map(b => b.jid));
      if (pendingList.length > 0) {
        const selector = args[0];
        if (!selector) {
          const listPromises = pendingList.map(async (p, index) => {
            let jid;
            if (p.endsWith('@lid')) {
              jid = await mongoStore.findJidByLid(p);
            } else {
              jid = p
            }
            return `${index + 1}. @${(jid)?.split('@')[0]}`;
          });
          const listText = (await Promise.all(listPromises)).join('\n');
          return await sReply(`*Daftar Permintaan Bergabung:*\n${listText}\n\n*Gunakan:*\n- ${dbSettings.rname}accept all\n- ${dbSettings.rname}accept <nomor> (contoh: ${dbSettings.rname}accept 1,3)`);
        }
        let jidsToApprove = [];
        if (selector.toLowerCase() === 'all' || selector.toLowerCase() === 'semua') {
          jidsToApprove = pendingList;
        } else {
          jidsToApprove = archimed(selector, pendingList);
        }
        if (jidsToApprove.length > 0) {
          await fn.groupRequestParticipantsUpdate(toId, jidsToApprove, 'approve');
          let mentionParts = [];
          for (const lid of jidsToApprove) {
            let jid;
            if (lid.endsWith('@lid')) {
              jid = await mongoStore.findJidByLid(lid);
            } else {
              jid = lid
            }
            const numberToMention = jid?.split('@')[0];
            mentionParts.push(`@${numberToMention}`);
          }
          const approvedText = mentionParts.join(', ');
          await sReply(`Berhasil menyetujui: ${approvedText}`);
        }
      } else {
        await sReply('Saat ini tidak ada permintaan bergabung yang tertunda.');
      }
    }
  }
};