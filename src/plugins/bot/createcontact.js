// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'createcontact',
  category: 'bot',
  description: 'Membuat dan menyimpan kontak baru di buku alamat bot. (work hanya di WhatsApp versi web)',
  isCommandWithoutPayment: true,
  aliases: ['savecontact', 'addcontact'],
  execute: async ({ fn, quotedMsg, quotedParticipant, mentionedJidList, arg, dbSettings, sReply }) => {
    let targetJid;
    let contactName;
    const mentioned = mentionedJidList[0];
    if (mentioned) {
      targetJid = mentioned;
      contactName = arg.replace(/@\d+/g, '').trim();
      if (!contactName) return await sReply(`Saat menggunakan mention, nama harus disertakan.\nContoh: ${dbSettings.rname}savekontak Yanto Baut @62812...`);
    } else if (quotedMsg) {
      targetJid = quotedParticipant;
      contactName = arg;
      if (!contactName) return await sReply(`Saat membalas pesan, nama harus disertakan.\nContoh: ${dbSettings.rname}savekontak Yanto Kopling`);
    } else {
      const parts = arg.split('|').map((s) => s.trim());
      if (parts.length < 2 || !parts[0] || !parts[1]) return await sReply(`Format salah.\nGunakan: ${dbSettings.rname}savekontak Nama|Nomor\nContoh: ${dbSettings.rname}savekontak Yanto Ngocok | 6281234567890`);
      contactName = parts[0];
      const sanitizedNumber = parts[1].replace(/[^0-9]/g, '');
      targetJid = `${sanitizedNumber}@s.whatsapp.net`;
    }
    if (!targetJid || !contactName) return await sReply('Gagal menentukan target atau nama kontak.');
    const contactData = {
      fullName: contactName,
      saveOnPrimaryAddressbook: true
    };
    await fn.addOrEditContact(targetJid, contactData);
    await sReply(`Sukses!\n\nKontak "${contactName}" untuk nomor ${targetJid.split('@')[0]} berhasil disimpan.`);
  }
};
