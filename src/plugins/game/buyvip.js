// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';
import { formatNumber, formatDuration } from '../../function/function.js';

export const command = {
  name: 'buyvip',
  category: 'game',
  description: 'Membeli status VIP selama 30 hari menggunakan balance.',
  isCommandWithoutPayment: true,
  execute: async ({ user, sReply, serial }) => {
    const priceVIP = 100000000000000n;
    const namedVIP = "VIP";
    if (user.balance < priceVIP) {
      return await sReply(
        `Poin balancemu tidak cukup untuk membeli ${namedVIP}.\n\n` +
        `💰 Butuh: *${formatNumber(priceVIP)}*\n` +
        `✅ Kamu punya: *${formatNumber(user.balance)}*`
      );
    }
    if (user.isVIPActive) {
      return await sReply(`Kamu sudah menjadi anggota VIP.`);
    }
    const duration = formatDuration('30d');
    const durationMs = duration.asMilliseconds();
    await user.minBalance(priceVIP);
    await User.addVIP(serial, durationMs);
    const newBalance = user.balance;
    const successMessage =
      `🎉 Selamat, @${serial.split('@')[0]}!\n\n` +
      `Anda berhasil membeli akses *${namedVIP}* selama 30 hari.\n\n` +
      `🧾 Harga: *${formatNumber(priceVIP)}*\n` +
      `💰 Saldo Akhir: *${formatNumber(newBalance)}*`;
    await sReply(successMessage);
  }
};