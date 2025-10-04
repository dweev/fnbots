// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'listblock',
  category: 'list',
  description: 'Menampilkan semua daftar blocklist.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, sReply, isSadmin, isMaster }) => {
    if (!(isSadmin || isMaster)) return;
    const blockNumber = await fn.fetchBlocklist();
    await sReply(`Total Number Blocked: ${blockNumber.length}\n\n` + blockNumber.map((num, i) => `${i + 1}. @${num.split('@')[0]}`).join('\n'));
  },
};