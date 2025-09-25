// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'groupopen',
  category: 'manage',
  description: 'Membuka grup, semua anggota bisa mengirim pesan.',
  aliases: ['open'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, isBotGroupAdmins, reactDone }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di grup.');
    if (!isBotGroupAdmins) return await sReply('Bot harus menjadi admin grup untuk menjalankan perintah ini.');
    await Promise.all([fn.groupSettingUpdate(m.chat, 'not_announcement'), reactDone(), sReply('Grup berhasil dibuka, semua anggota dapat mengirim pesan.')]);
  }
}