// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'unsend',
  category: 'manage',
  description: 'membatalkan atau menghapus pesan untuk semua.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, isBotGroupAdmins, toId, quotedParticipant, sReply }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan didalam group.`);
    if (!isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    if (!quotedMsg || !quotedMsg?.key?.fromMe) return await sReply(`Perintah ini hanya bisa digunakan dengan membalas pesan bot.`);
    await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: m.isBotAdmin ? false : true, id: quotedMsg?.key.id, participant: quotedParticipant } });
  }
};
