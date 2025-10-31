// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const command = {
  name: 'upstory',
  category: 'master',
  description: 'Mengunggah Story ke WhatsApp',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, arg, sReply, quotedMsg, dbSettings, store }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mediaObject = targetMsg?.imageMessage || targetMsg?.videoMessage || targetMsg?.audioMessage;
    let options = {};
    if (mediaObject) {
      const mime = mediaObject.mimetype;
      const buffer = await fn.getMediaBuffer(mediaObject);
      if (mime.includes('image')) {
        options = { image: buffer, caption: arg || '' };
      } else if (mime.includes('video')) {
        options = { video: buffer, caption: arg || '' };
      } else if (mime.includes('audio')) {
        options = { audio: buffer, mimetype: 'audio/mp4' };
      } else {
        return await sReply('Format media tidak didukung untuk status.');
      }
    } else if (arg) {
      options = { text: arg };
    } else {
      return await sReply(`Perintah tidak valid. Kirim teks atau media (gambar/video/audio) dengan caption \`${dbSettings.rname}upsw\`.`);
    }
    const allContacts = await store.getAllContacts();
    if (!allContacts || allContacts.length === 0) return await sReply('Tidak ada kontak yang tersimpan.');
    const jidList = allContacts.filter((contact) => contact.jid && contact.jid.endsWith('@s.whatsapp.net')).map((contact) => contact.jid);
    if (jidList.length === 0) {
      return await sReply('Tidak ada kontak WhatsApp yang valid.');
    }
    await fn.sendMessage('status@broadcast', options, {
      backgroundColor: '#0B5345',
      font: 5,
      statusJidList: jidList
    });
    await sReply(`Status berhasil diunggah ke ${jidList.length} kontak!`);
  }
};
