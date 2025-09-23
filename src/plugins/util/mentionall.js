// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'mentionall',
  category: 'util',
  description: 'Menyebutkan semua anggota grup.',
  aliases: ['tagall', 'tag'],
  execute: async ({ fn, m, toId, sReply }) => {
    if (!m.isGroup) return await sReply("Perintah ini hanya bisa digunakan di grup.");
    const groupMetadata = await fn.groupMetadata(toId);
    const mentions = groupMetadata.participants.map(member => member.id);
    let message = "📢 MENTIONALL MEMBER\n";
    mentions.forEach((jid, idx) => {
      message += `\n${idx + 1}. @${jid.split('@')[0]}`;
    });
    await fn.sendPesan(toId, message, m);
  }
}