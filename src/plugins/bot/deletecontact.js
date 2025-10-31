// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'deletecontact',
  category: 'bot',
  description: 'Menghapus kontak dari buku alamat bot. (work hanya di WhatsApp versi web)',
  isCommandWithoutPayment: true,
  aliases: ['hapuscontact', 'delcontact'],
  execute: async ({ fn, quotedMsg, quotedParticipant, mentionedJidList, arg, dbSettings, sReply }) => {
    let targetJid;
    const mentioned = mentionedJidList[0];
    if (mentioned) {
      targetJid = mentioned;
    } else if (quotedMsg) {
      targetJid = quotedParticipant;
    } else if (arg) {
      const sanitizedNumber = arg.replace(/[^0-9]/g, '');
      if (!sanitizedNumber) return await sReply('Nomor tidak valid. Berikan nomor, mention, atau balas pesan.');
      targetJid = `${sanitizedNumber}@s.whatsapp.net`;
    } else {
      return await sReply(`Anda harus menunjuk target!\nBalas pesan, mention, atau berikan nomor.\nContoh: ${dbSettings.rname}hapuskontak @user`);
    }
    await fn.removeContact(targetJid);
    await sReply(`Sukses!\n\nNama untuk kontak ${targetJid.split('@')[0]} telah dihapus.`);
  }
};
