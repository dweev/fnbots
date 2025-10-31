// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'number',
  category: 'util',
  description: 'Mendapatkan info number target',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, quotedParticipant, sReply, mentionedJidList }) => {
    const targetId = quotedMsg ? quotedParticipant : mentionedJidList[0];
    if (!targetId) return await sReply(`Silakan balas pesan atau sebut nomor yang ingin kamu ambil nomornya.`);
    await sReply(targetId.split('@')[0]);
  }
};
