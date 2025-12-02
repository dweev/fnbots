// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { User } from '../../../database/index.js';

export const command = {
  name: 'mutelist',
  category: 'owner',
  description: 'Lihat daftar pengguna yang di-ban secara global',
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const mutedUsers = await User.find({ isMuted: true }).select('userId');
    if (mutedUsers.length === 0) {
      await sReply('Tidak ada pengguna yang di-ban.');
      return;
    }
    let message = 'Daftar Pengguna yang Di-ban:\n';
    mutedUsers.forEach((user, index) => {
      message += `${index + 1}. @${user.userId.split('@')[0]}\n`;
    });
    await sReply(message);
  }
};
