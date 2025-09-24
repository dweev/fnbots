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
  execute: async ({ fn, m, quotedMsg, isBotGroupAdmins, toId, quotedParticipant, sReply }) => {
    if (!m.isGroup || !quotedMsg || !quotedMsg?.key?.fromMe && !isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan di grup, harus membalas pesan bot dan bot harus menjadi admin grup.`);
    await fn.sendMessage(toId, { delete: { remoteJid: toId, fromMe: m.isBotAdmin ? false : true, id: quotedMsg?.key.id, participant: quotedParticipant } });
  }
};