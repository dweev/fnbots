// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const command = {
  name: 'invite',
  category: 'manage',
  description: 'Mengundang pengguna ke grup.',
  aliases: ['inv', 'undang'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, sReply, isBotGroupAdmins, quotedMsg, mentionedJidList, args, dbSettings, serial }) => {
    if (!m.isGroup) return await sReply('Perintah ini hanya bisa digunakan di grup.');
    if (!isBotGroupAdmins) return await sReply("Saya harus menjadi admin di grup ini untuk bisa mengundang orang lain.");
    let targets = [];
    if (quotedMsg) {
      targets.push(m.quoted.sender);
    } else if (mentionedJidList.length > 0) {
      targets.push(...mentionedJidList);
    } else if (args[0]) {
      const sanitizedNumber = args[0].replace(/\D/g, '');
      if (!sanitizedNumber) return await sReply("Nomor yang Kamu masukkan tidak valid.");
      targets.push(sanitizedNumber + '@s.whatsapp.net');
    } else {
      return await sReply(`Cara penggunaan: Balas (reply) pesan target, tag @user, atau ketik nomornya.\nContoh: ${dbSettings.rname}invite 6281234567890`);
    }
    for (const target of targets) {
      const results = await fn.groupParticipantsUpdate(toId, [target], 'add');
      if (!results || results.length === 0) return await sReply("Gagal mendapatkan status penambahan dari WhatsApp");
      const result = results[0];
      const targetUserMention = `@${target.split('@')[0]}`;
      switch (result.status.toString()) {
        case '200':
          await sReply(`Berhasil menambahkan ${targetUserMention} ke dalam grup!`);
          break;
        case '409':
          await sReply(`Info: ${targetUserMention} sudah menjadi anggota grup ini.`);
          break;
        case '403': {
          await sReply(`Info: ${targetUserMention} tidak dapat ditambahkan karena pengaturan privasi.\n\nUndangan akan dikirimkan secara pribadi.`);
          const inviteData = result.content.content[0].attrs;
          await fn.sendGroupInvite(toId, target, inviteData.code, inviteData.expiration, m.metadata.subject, `Admin: @${serial.split('@')[0]} mengundang Kamu untuk bergabung.`, null, { mentions: [serial] });
          break;
        }
        case '408': {
          await sReply(`Info: ${targetUserMention} baru saja keluar dari grup.\n\nKarena privasi, undangan akan dikirimkan secara pribadi.`);
          const inviteCode = await fn.groupInviteCode(toId);
          await fn.sendPesan(target, `Kamu diundang kembali ke grup, silahkan klik link berikut untuk bergabung: https://chat.whatsapp.com/${inviteCode}`, m);
          break;
        }
        case '401':
          return await sReply(`Gagal: ${targetUserMention} telah memblokir bot ini.`);
        case '500':
          return await sReply("Gagal: Grup sudah penuh.");
        default:
          return await sReply(`Gagal menambahkan user dengan status kode tidak dikenal: ${result.status}`);
      }
    }
  }
};