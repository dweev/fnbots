// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'listpc',
  category: 'list',
  description: 'Menampilkan daftar chat pribadi (PC) berdasarkan jumlah pesan konten.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, isSadmin, isMaster, store }) => {
    if (!(isSadmin || isMaster)) return;
    const sortedUsers = await store.getPrivateChatStats();
    if (!sortedUsers || sortedUsers.length === 0) {
      return await sReply('Tidak ada pesan konten dari pengguna yang bisa dihitung.');
    }
    let replyText = `*Top Private Chats*\n\nTotal ${sortedUsers.length} pengguna telah mengirim pesan:\n\n`;
    sortedUsers.forEach((user, index) => {
      const jid = user._id;
      const count = user.count;
      const userNumber = jid.split('@')[0];
      replyText += `${index + 1}. @${userNumber} → *${count}* pesan\n`;
    });
    await sReply(replyText);
  }
};
