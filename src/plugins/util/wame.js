// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'wame',
  category: 'util',
  description: 'Mengubah nomor target menjadi link wa.me',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, quotedParticipant, sReply, mentionedJidList }) => {
    const targetId = quotedMsg ? quotedParticipant : mentionedJidList[0];
    if (!targetId) return await sReply(`Silakan balas pesan atau sebut nomor yang ingin kamu ubah nomornya menjadi link wa.me/`);
    await sReply(`wa.me/${targetId.split('@')[0]}`);
  }
};