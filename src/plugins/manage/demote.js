// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'demote',
  category: 'manage',
  description: 'Menghapus anggota dari status admin grup.',
  aliases: ['deladmin'],
  execute: async ({ fn, m, toId, sReply, isBotGroupAdmins, quotedMsg, quotedParticipant, mentionedJidList }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    if (!isBotGroupAdmins) return await sReply(`Bot harus menjadi admin grup untuk menjalankan perintah ini.`);
    let targetId;
    if (quotedMsg) {
      targetId = quotedParticipant;
    } else if (mentionedJidList.length === 1) {
      targetId = mentionedJidList[0];
    } else {
      return await sReply(`Gunakan perintah ini dengan membalas pesan atau tag @user yang ingin dihapus dari admin.`);
    }
    const metadata = await fn.groupMetadata(toId);
    const groupAdmins = metadata?.participants?.filter(p => p.admin) || [];
    if (!groupAdmins.some(admin => admin.id === targetId)) return await sReply(`@${targetId.split('@')[0]} bukan admin grup.`);
    await fn.demoteParticipant(toId, targetId);
    await sReply(`Sukses menghapus @${targetId.split('@')[0]} dari admin.`);
  }
}