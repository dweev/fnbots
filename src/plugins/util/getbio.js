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
    const statusData = await fn.fetchStatus(targetId);
    console.log(statusData);
    if (!statusData || statusData.length === 0) return await sReply(`User ID: ${targetId}\nTidak dapat mengambil bio user.`);
    const userStatus = statusData[0]?.status?.status;
    if (userStatus && userStatus.trim() !== '') {
      await sReply(`Bio dari @${targetId.split('@')[0]}:\n\n${userStatus}`);
    } else {
      await sReply(`User ID: @${targetId.split('@')[0]}\n\nTidak ada bio atau privasi user tidak menginginkan bio nya dilihat oleh orang lain.`);
    }
  }
};
