// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { randomByte } from '../../lib/function.js';

export const command = {
  name: 'hidetag',
  category: 'util',
  description: 'Tag semua anggota grup tanpa menyebutkan nama satu per satu.',
  aliases: ['ht'],
  execute: async ({ fn, m, toId, arg, dbSettings }) => {
    if (!m.isGroup) throw new Error("Perintah ini hanya bisa digunakan di grup.");
    if (!arg) throw new Error(`Gunakan format: ${dbSettings.rname}hidetag <pesan>`);
    const groupMetadata = await fn.groupMetadata(toId);
    const mentions = groupMetadata.participants.map(member => member.id);
    await fn.sendMessage(toId, { text: arg, mentions: mentions }, { ephemeralExpiration: m?.expiration ?? 0, messageId: randomByte(32) });
  }
}