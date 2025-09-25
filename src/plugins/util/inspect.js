// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'inspect',
  category: 'util',
  description: 'Menginspect link group untuk melihat metadatanya.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, args, dbSettings, sReply }) => {
    if (!args || args.length === 0) return await sReply(`Gunakan format: ${dbSettings.rname}inspect <link group>`);
    const inviteLink = args.trim();
    const inviteCode = inviteLink.split("https://chat.whatsapp.com/")[1];
    if (!inviteCode) return await sReply("Link group WhatsApp tidak valid.");
    const groupInfo = await fn.groupGetInviteInfo(inviteCode);
    let message = '📋 Informasi Group:\n';
    message += `• ID Group: ${groupInfo.id}\n`;
    message += `• Nama Group: ${groupInfo.subject || 'Tidak tersedia'}\n`;
    message += `• Dibuat: ${new Date(groupInfo.creation * 1000).toLocaleString()}\n`;
    message += `• Jumlah Anggota: ${groupInfo.size}\n`;
    message += `• Mode Bergabung: ${groupInfo.joinApprovalMode ? 'Perlu Persetujuan' : 'Bebas'}\n`;
    message += `• Pembatasan: ${groupInfo.restrict ? 'Aktif' : 'Tidak Aktif'}\n`;
    message += `• Pengumuman: ${groupInfo.announce ? 'Dibatasi' : 'Terbuka'}`;
    await sReply(message);
  }
}