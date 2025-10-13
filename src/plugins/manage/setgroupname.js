// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'setgroupname',
  category: 'manage',
  description: 'Mengatur nama group',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, sReply, isBotGroupAdmins, serial, arg, m }) => {
    if (!m.isGroup) return await sReply(`Perintah ini hanya bisa digunakan didalam group.`);
    if (!isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan jika bot menjadi admin grup.`);
    const groupchat = await fn.groupMetadata(toId);
    const oldName = groupchat.subject || 'Tidak diketahui';
    const newName = arg.trim();
    if (!newName || newName.length > 100) return await sReply(`Nama grup harus diisi dan maksimal 100 karakter.`);
    await fn.groupUpdateSubject(toId, newName);
    await sReply(`✅ Nama grup telah diubah!\n\n👤 Pelaku: @${serial.split('@')[0]}\n\n• Sebelumnya: ${oldName}\n• Sekarang: ${newName}`);
  }
};