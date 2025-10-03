// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { StoreContact } from '../../../database/index.js';

export const command = {
  name: 'upstory',
  category: 'master',
  description: 'Mengunggah Story ke WhatsApp',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, arg, sReply, quotedMsg, dbSettings }) => {
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
    const allContacts = await StoreContact.find({ jid: { $regex: /@s\.whatsapp\.net$/ } }).select('jid').lean();
    if (allContacts.length === 0) {
      return await sReply("Tidak ada kontak yang tersimpan di database.");
    }
    const jidList = allContacts.map(contact => contact.jid);
    await fn.sendMessage("status@broadcast", options, {
      backgroundColor: "#0B5345",
      font: 5,
      statusJidList: jidList
    });
    await sReply('✅ Status berhasil diunggah!');
  }
};