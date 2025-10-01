// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { formatNumber } from '../../function/index.js';

export const command = {
  name: 'buylimit',
  category: 'game',
  description: 'Membeli limit menggunakan balance.',
  isCommandWithoutPayment: true,
  execute: async ({ args, user, sReply, serial }) => {
    if (args.length !== 1) {
      return await sReply(`Format salah. Gunakan: .buylimit <jumlah>`);
    }
    const limitOptions = {
      '50': 1500n, '100': 3000n, '150': 4500n, '200': 6000n,
      '250': 7500n, '300': 9000n, '350': 10500n, '400': 12000n,
      '450': 13500n, '500': 15000n, '1500': 150000n, '15000': 1500000n
    };
    const amountStr = args[0];
    const price = limitOptions[amountStr];
    const amount = parseInt(amountStr, 10);
    if (!price) {
      return await sReply(`Pilihan limit tidak valid! Pilih salah satu: ${Object.keys(limitOptions).join(', ')}`);
    }
    if (user.balance < price) {
      return await sReply(
        `Poin balancemu tidak cukup.\n\n` +
        `💰 Butuh: *${formatNumber(price)}*\n` +
        `✅ Kamu punya: *${formatNumber(user.balance)}*`
      );
    }
    await user.minBalance(price);
    user.limit.current += amount;
    await user.save();
    const newBalance = user.balance;
    const successMessage =
      `🎉 Selamat, @${serial.split('@')[0]}!\n\n` +
      `Kamu berhasil membeli *+${amountStr} Limit* dengan harga *${formatNumber(price)}*.\n\n` +
      `💰 Saldo Akhir: ${formatNumber(newBalance)}`;
    await sReply(successMessage);
  }
};