// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import sharp from 'sharp';
import { QuoteGenerator } from 'qc-generator-whatsapp';
import { processAllTextFormatting } from '../../function/index.js';

export const command = {
  name: 'qcimage',
  category: 'convert',
  description: 'Membuat Quote Chat',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, serial, sReply, arg, pushname, toId, dbSettings, StoreMessages }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    if (!targetMsg) return await sReply("Media tidak ditemukan.");
    const mime = targetMsg?.imageMessage?.mimetype || targetMsg?.stickerMessage?.mimetype;
    if (!mime) return await sReply("Kirim atau balas gambar!");
    const buffer = await fn.getMediaBuffer(targetMsg);
    if (!buffer) return await sReply("Gagal mengunduh media.");
    const bufferMedia = await sharp(buffer).png().toBuffer();
    let profilePicUrl = null;
    try {
      profilePicUrl = await fn.profileImageBuffer(serial, 'image');
    } catch {
      // log("lanjut");
    }
    const { text: finalCleanText, entities: allEntities } = await processAllTextFormatting(arg, StoreMessages, fn);
    const params = {
      type: 'image',
      format: 'png',
      scale: 2,
      backgroundColor: '#1a1a1a',
      messages: [{
        avatar: true,
        from: {
          id: 1,
          name: pushname,
          photo: { buffer: profilePicUrl }
        },
        text: finalCleanText,
        entities: allEntities,
        media: { buffer: bufferMedia }
      }]
    };
    const result = await QuoteGenerator(params);
    const resultBuffer = Buffer.from(result.image, 'base64');
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resultBuffer, dbSettings.autocommand, m);
  }
};