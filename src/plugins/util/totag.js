// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { proto } from 'baileys';
import { randomByte } from '../../lib/function.js';

export const command = {
  name: 'totag',
  category: 'util',
  description: 'Meneruskan pesan yang dikutip sambil menandai semua anggota grup.',
  aliases: ['ttg'],
  execute: async ({ fn, m, toId, quotedMsg, reactFail }) => {
    if (!m.isGroup || !quotedMsg) {
      await reactFail();
      return;
    }
    const groupMetadata = await fn.groupMetadata(toId);
    await fn.sendMessage(toId, {
      forward: proto.WebMessageInfo.create({
        key: m.quoted.key,
        message: m.quoted,
        ...(m.isGroup ? { participant: m.quoted.sender } : {})
      }),
      mentions: groupMetadata.participants.map(a => a.id)
    }, {
      ephemeralExpiration: m?.expiration ?? 0,
      messageId: randomByte(32)
    });
  }
};