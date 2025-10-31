// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'banlist',
  category: 'manage',
  description: 'Lihat daftar pengguna yang di-ban didalam group',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, groupData }) => {
    const bannedUsers = groupData.bannedMembers;
    if (bannedUsers.length === 0) {
      await sReply('Tidak ada pengguna yang di-ban.');
      return;
    }
    let message = 'Daftar Pengguna yang Di-ban:\n';
    bannedUsers.forEach((user, index) => {
      message += `${index + 1}. @${user.split('@')[0]}\n`;
    });
    await sReply(message);
  }
};
