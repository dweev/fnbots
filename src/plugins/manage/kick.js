// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'kick',
  category: 'manage',
  description: 'Mengeluarkan anggota dari grup.',
  aliases: ['tendang', 'pancal', 'gajul'],
  execute: async ({ fn, m, toId, sReply, isBotGroupAdmins, quotedMsg, mentionedJidList, ownerNumber, reactDone }) => {
    if (!m.isGroup) throw new Error(`Perintah ini hanya bisa digunakan di grup.`);
    if (!isBotGroupAdmins) throw new Error(`Bot harus menjadi admin grup untuk menjalankan perintah ini.`);
    let targets = [];
    if (quotedMsg) {
      targets.push(m.quoted.sender);
    } else if (mentionedJidList.length > 0) {
      targets.push(...mentionedJidList);
    } else {
      throw new Error(`Gunakan perintah ini dengan membalas pesan atau tag @user yang ingin di-kick.`);
    }
    let failedUsers = [];
    const metadata = await fn.groupMetadata(toId);
    const groupAdmins = metadata?.participants?.filter(p => p.admin) || [];
    for (const jid of targets) {
      if (groupAdmins.some(admin => admin.id === jid) || ownerNumber.includes(jid)) {
        failedUsers.push(jid);
        continue;
      }
      await fn.removeParticipant(toId, jid);
      await reactDone();
    }
    if (failedUsers.length > 0) {
      await sReply(`Gagal kick beberapa user karena mereka memiliki privilege: ${failedUsers.map(jid => `@${jid.split('@')[0]}`).join(', ')}`);
    }
  }
};