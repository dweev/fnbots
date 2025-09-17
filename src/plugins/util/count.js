// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'count',
  category: 'info',
  description: 'Menampilkan jumlah penggunaan bot oleh user',
  aliases: ['myhit', 'hitstats', 'hitcount'],
  execute: async ({ sReply, serial, user }) => {
    await sReply(`*Statistik Penggunaan Bot*\n\n` +
      `➸ *User*: @${serial.split('@')[0]}\n` +
      `➸ *Total Hit*: ${user.userCount}\n`);
  }
};