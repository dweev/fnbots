// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { delay } from 'baileys';

export const command = {
  name: 'spam',
  category: 'master',
  description: 'Spam text dalam jumlah tertentu.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, args, dbSettings, sPesan }) => {
    if (args) {
      const _num = parseInt(args[0]);
      if (isNaN(_num) || _num < 1) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}spam 5 pesanmu`);
      const _pesan = args.slice(1).join(' ');
      for (let i = 0; i < _num; i++) {
        await sPesan(_pesan);
        await delay(500);
      }
    }
  }
};