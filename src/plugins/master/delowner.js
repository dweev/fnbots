// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';

export const command = {
  name: 'delowner',
  category: 'master',
  description: 'Menambahkan User menjadi owner dari Bot.',
  aliases: ['delown', 'delmaster'],
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, quotedMsg, arg, mentionedJidList, quotedParticipant, sReply }) => {
    if (!arg && !quotedMsg) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}delowner @user atau reply pesan user`);
    if (mentionedJidList.length != 0) {
      for (let men of mentionedJidList) {
        await User.removeMaster(men);
        await reactDone();
      }
    } else if (quotedMsg) {
      await User.removeMaster(quotedParticipant);
      await reactDone();
    }
  }
};