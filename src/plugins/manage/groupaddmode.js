// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'groupaddmode',
  category: 'manage',
  description: 'Memberikan informasi group.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, isBotGroupAdmins, toId, sReply, args, reactDone }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan didalam group.`);
    if (!isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    const modeInput = (args[0] || '').toLowerCase();
    const modeMap = {
      'member': 'all_member_add',
      'admin': 'admin_add'
    };
    if (!Object.prototype.hasOwnProperty.call(modeMap, modeInput)) return await sReply(`Gunakan argumen "member" atau "admin"`);
    const mode = modeMap[modeInput];
    await fn.groupMemberAddMode(toId, mode);
    await reactDone();
  }
};
