// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'groupclose',
  category: 'manage',
  description: 'Menutup grup, hanya admin yang bisa mengirim pesan.',
  aliases: ['close'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, isBotGroupAdmins, reactDone }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di grup.');
    if (!isBotGroupAdmins) return await sReply('Bot harus menjadi admin grup untuk menjalankan perintah ini.');
    await Promise.all([fn.groupSettingUpdate(m.chat, 'announcement'), reactDone(), sReply('Grup berhasil ditutup, hanya admin yang dapat mengirim pesan.')]);
  }
}