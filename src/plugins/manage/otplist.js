// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { OTPSession } from '../../../database/index.js';

export const command = {
  name: 'otplist',
  displayName: 'otp-list',
  category: 'manage',
  description: 'Melihat semua session OTP yang aktif',
  isCommandWithoutPayment: true,
  aliases: ['otp-list'],
  execute: async ({ sReply }) => {
    const sessions = await OTPSession.find({ isBlocked: false }).lean();
    if (sessions.length === 0) return await sReply('Tidak ada session OTP yang aktif saat ini.');
    let list = `*Daftar Session OTP Aktif (${sessions.length})*\n\n`;
    sessions.forEach((session, index) => {
      const remainingMs = session.expireAt.getTime() - Date.now();
      const remainingMin = Math.max(0, Math.floor(remainingMs / 60000));
      list += `${index + 1}. @${session.userId.split('@')[0]}\n`;
      list += `   OTP: ||${session.otp}||\n`;
      list += `   Attempts: ${session.attempts}/4\n`;
      list += `   Expires: ${remainingMin}m\n\n`;
    });
    await sReply(list);
  }
};
