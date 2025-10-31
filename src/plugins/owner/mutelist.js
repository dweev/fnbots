// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'mutelist',
  category: 'owner',
  description: 'Lihat daftar pengguna yang di-ban secara global',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, user }) => {
    const bannedUsers = user.mutedUsers;
    if (bannedUsers.length === 0) {
      await sReply('Tidak ada pengguna yang di-ban.');
      return;
    }
    let message = 'Daftar Pengguna yang Di-ban:\n';
    bannedUsers.forEach((user, index) => {
      message += `${index + 1}. @${user.userId.split('@')[0]}\n`;
    });
    await sReply(message);
  }
};
