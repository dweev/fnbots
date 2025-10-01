// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { getCommonGroups } from '../../function/index.js';

export const command = {
  name: 'find',
  category: 'vip',
  description: 'Mencari informasi berapa group yang sama antara bot dan target.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, args, mentionedJidList, dbSettings }) => {
    if (mentionedJidList.length !== 0) {
      for (let a of mentionedJidList) {
        const groupsFound = await getCommonGroups(a);
        let list = '';
        for (let grp of groupsFound) {
          list += `${grp.subject || grp.formattedTitle || 'Unnamed Group'}\n`;
        }
        await sReply(`Hasil pencarian untuk:\n@${a.split('@')[0]}\n\n${list || 'Tidak ditemukan grup.'}`);
      }
    } else if (args && args[0]) {
      const a = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      const groupsFound = await getCommonGroups(a);
      let list = '';
      for (let grp of groupsFound) {
        list += `${grp.subject || grp.formattedTitle || 'Unnamed Group'}\n`;
      }
      await sReply(`Hasil pencarian untuk:\n@${a.split('@')[0]}\n\n${list || 'Tidak ditemukan grup.'}`);
    } else {
      return await sReply(`Tolong tag user atau masukkan nomor untuk dicari.\n\nContoh: ${dbSettings.rname}find @user1 @user2\natau ${dbSettings.rname}find 6281234567890`);
    }
  },
};
