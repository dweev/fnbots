// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatNumber } from '../../function/index.js';

export const command = {
  name: 'character',
  displayName: 'character-count',
  category: 'fun',
  description: `Menghitung jumlah karakter dalam pesan yang dikutip atau teks yang diberikan.`,
  isCommandWithoutPayment: true,
  aliases: ['character-count'],
  execute: async ({ arg, quotedMsg, sReply, dbSettings }) => {
    if (quotedMsg && (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation')) {
      const text = quotedMsg?.body;
      await sReply(formatNumber(text.length));
    } else {
      if (!arg) return await sReply(`Format salah!\nGunakan perintah seperti: ${dbSettings.sname}character-count <teks>`);
      const text = arg;
      await sReply(formatNumber(text.length));
    }
  }
};