// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'promote',
  category: 'manage',
  description: 'Menjadikan anggota grup sebagai admin.',
  aliases: ['addadmin'],
  execute: async ({ fn, m, toId, sReply, isBotGroupAdmins, quotedMsg, quotedParticipant, mentionedJidList }) => {
    if (!m.isGroup) throw new Error(`Perintah ini hanya bisa digunakan di grup.`);
    if (!isBotGroupAdmins) throw new Error(`Bot harus menjadi admin grup untuk menjalankan perintah ini.`);
    let targetId;
    if (quotedMsg) {
      targetId = quotedParticipant;
    } else if (mentionedJidList.length === 1) {
      targetId = mentionedJidList[0];
    } else {
      throw new Error(`Gunakan perintah ini dengan membalas pesan atau tag @user yang ingin dijadikan admin.`);
    }
    const metadata = await fn.groupMetadata(toId);
    const groupAdmins = metadata?.participants?.filter(p => p.admin) || [];
    if (groupAdmins.some(admin => admin.id === targetId)) throw new Error(`@${targetId.split('@')[0]} sudah menjadi admin.`);
    await fn.promoteParticipant(toId, targetId);
    await sReply(`Sukses menambahkan @${targetId.split('@')[0]} sebagai admin.`);
  }
};