// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { randomChoice } from '../../function/index.js';
import khodams from '../../games/cekkhodam.json' with { type: 'json' };

export const command = {
  name: 'khodam',
  category: 'fun',
  description: `Melihat info khodam`,
  isCommandWithoutPayment: true,
  execute: async ({ arg, sReply, quotedParticipant, mentionedJidList, sPesan, serial }) => {
    const khodam = randomChoice(khodams);
    const targetId = quotedParticipant || (mentionedJidList?.[0]);
    if (targetId) {
      await sReply(`khodam dari @${targetId.split('@')[0]} adalah *${khodam.nama}*\n${khodam.deskripsi}`);
    } else if (arg) {
      await sPesan(`khodam dari ${arg} adalah *${khodam.nama}*\n${khodam.deskripsi}`);
    } else {
      await sReply(`khodam dari @${serial.split('@')[0]} adalah *${khodam.nama}*\n${khodam.deskripsi}`);
    }
  }
};