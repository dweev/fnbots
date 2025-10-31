// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'getbio',
  category: 'util',
  description: 'Mengambil bio dari user yang ditandai atau dibalas pesannya',
  isCommandWithoutPayment: true,
  execute: async ({ fn, sReply, quotedMsg, quotedParticipant, mentionedJidList }) => {
    const targetId = quotedMsg ? quotedParticipant : mentionedJidList[0];
    if (!targetId) return await sReply(`Silakan balas pesan atau tag nomor yang ingin ambil bio nya.`);
    const status = await fn.fetchStatus(targetId);
    if (status && status.status && status.status.status !== '' && status.status.status !== '1970-01-01T00:00:00.000Z') {
      await sReply(`Bio dari ${targetId}: ${status.status.status}`);
    } else {
      await sReply(`User ID: ${targetId}\nTidak ada bio atau privasi user tidak menginginkan bio nya dilihat oleh orang lain.`);
    }
  }
};
