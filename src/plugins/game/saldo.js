// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatNumber } from '../../function/index.js';

export const command = {
  name: 'saldo',
  category: 'game',
  description: 'Cek saldo member',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, user }) => {
    const formattedBalance = formatNumber(BigInt(user.balance));
    await sReply(`💰 Saldo Anda: *${formattedBalance}*`);
  }
};