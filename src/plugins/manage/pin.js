// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'pin',
  category: 'manage',
  description: 'Menyematkan pesan.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, isBotGroupAdmins, toId, sReply, args, quotedMsg }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan didalam group.`);
    if (!isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    if (quotedMsg) {
      const arg1 = args[0]?.toLowerCase();
      let actionType = 1;
      let durationInSeconds = 2592000;
      let actionText = 'disematkan';
      const durationMap = {
        '24h': 86400,
        '7d': 604800,
        '30d': 2592000
      };
      if (arg1 === 'off') {
        actionType = 2;
        durationInSeconds = 0;
        actionText = 'sematannya telah dilepaskan';
      } else if (durationMap[arg1]) {
        durationInSeconds = durationMap[arg1];
      }
      await fn.sendMessage(toId, {
        pin: quotedMsg?.key,
        type: actionType,
        time: durationInSeconds
      });
      if (actionType === 2) {
        await sReply(`📌 Pesan ${actionText}.`);
      }
    }
  }
};
