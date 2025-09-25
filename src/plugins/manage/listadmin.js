// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'listadmin',
  category: 'manage',
  description: 'Melihat daftar admin group.',
  aliases: ['adminlist'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, sReply, toId, m }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan di grup.`);
    const metadata = await fn.groupMetadata(toId);
    const groupAdmins = metadata?.participants?.reduce((a, b) => {
      if (b.admin) a.push({ id: b.id, admin: b.admin });
      return a;
    }, []) || [];
    const adminListText = groupAdmins.map((admin, i) => `${i + 1}. @${admin.id.split('@')[0]}`).join('\n');
    await fn.sendPesan(toId, `Daftar Admin Group: ${groupAdmins.length}\n\n` + adminListText, m);
  }
};