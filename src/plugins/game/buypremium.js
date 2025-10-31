// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';
import { formatNumber, formatDuration } from '../../function/index.js';

export const command = {
  name: 'buypremium',
  category: 'game',
  description: 'Membeli status Premium selama 30 hari menggunakan balance.',
  isCommandWithoutPayment: true,
  aliases: ['buyprem'],
  execute: async ({ user, sReply, serial }) => {
    const premiumPrice = 100000000000n;
    const premiumName = 'Premium';
    if (user.balance < premiumPrice) {
      // prettier-ignore
      return await sReply(
        `Poin balancemu tidak cukup untuk membeli ${premiumName}.\n\n` +
        `💰 Butuh: *${formatNumber(premiumPrice)}*\n` +
        `✅ Kamu punya: *${formatNumber(user.balance)}*`
      );
    }
    if (user.isPremiumActive) {
      return await sReply(`Kamu sudah menjadi anggota Premium.`);
    }
    const duration = formatDuration('30d');
    const durationMs = duration.asMilliseconds();
    await user.minBalance(premiumPrice);
    await User.addPremium(serial, durationMs);
    const newBalance = user.balance;
    // prettier-ignore
    const successMessage =
      `🎉 Selamat, @${serial.split('@')[0]}!\n\n` +
      `Anda berhasil membeli akses *${premiumName}* selama 30 hari.\n\n` +
      `🧾 Harga: *${formatNumber(premiumPrice)}*\n` +
      `💰 Saldo Akhir: *${formatNumber(newBalance)}*`;
    await sReply(successMessage);
  }
};
