// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { parseCheatAmount, formatNumber } from '../../function/function.js';

export const command = {
  name: 'cheatsaldo',
  category: 'owner',
  description: 'mengatur (cheat) saldo member',
  isCommandWithoutPayment: true,
  execute: async ({ arg, mentionedJidList, args, quotedParticipant, sReply, sPesan, serial, user }) => {
    const amountToCheat = parseCheatAmount(args[0]);
    if (!arg || amountToCheat === null) return await sReply("Format jumlah tidak valid. Contoh: 10k, 1.5m, atau angka yang sangat besar.");
    let targetId = quotedParticipant || mentionedJidList[0] || serial;
    if (!targetId) return await sReply("Mohon mention atau reply pesan user yang ingin di-cheat saldo.");
    await user.addBalance(amountToCheat.toString());
    await sPesan(`✅ Sukses cheat saldo sebanyak *${formatNumber(amountToCheat)}* kepada @${targetId.split('@')[0]}`);
  }
};