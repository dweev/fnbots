// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'setgroupdesc',
  category: 'manage',
  description: 'Mengatur deskripsi group',
  execute: async ({ fn, toId, sReply, isBotGroupAdmins, serial, arg, m }) => {
    if (!m.isGroup || !isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan di grup dan bot harus menjadi admin grup.`);
    const groupchat = await fn.groupMetadata(toId);
    const oldDesc = groupchat.desc || 'Tidak diketahui';
    const newDesc = arg.trim();
    if (!newDesc || newDesc.length > 2048) return await sReply(`Deskripsi grup harus diisi dan maksimal 2048 karakter.`);
    await fn.groupUpdateDescription(toId, newDesc);
    await sReply(`✅ Deskripsi grup telah diubah!\n👤 Pelaku: @${serial.split('@')[0]}\n\n• Sebelumnya:\n${oldDesc}\n\n• Sekarang:\n${newDesc}`);
  }
};