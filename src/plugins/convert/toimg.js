// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { bratGenerator } from 'qc-generator-whatsapp';
import { isAnimated, stickerToImage, stickerToVideo } from '../../addon/bridge.js';

export const command = {
  name: 'toimg',
  category: 'convert',
  description: 'Mengconvert text ke gambar',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, args, quotedMsg, toId, sReply, dbSettings }) => {
    if (quotedMsg && quotedMsg?.type === "stickerMessage") {
      const mediaData = await fn.getMediaBuffer(quotedMsg);
      const isAnimate = isAnimated(mediaData);
      if (isAnimate) {
        const mp4Buffer = stickerToVideo(mediaData, { fps: 10 });
        await fn.sendMediaFromBuffer(toId, 'video/mp4', mp4Buffer, dbSettings.autocommand, m);
      } else {
        const imageBuffer = stickerToImage(mediaData);
        await fn.sendMediaFromBuffer(toId, 'image/png', imageBuffer, dbSettings.autocommand, m);
      }
    } else {
      let inputText;
      if (quotedMsg && (quotedMsg?.type === "extendedTextMessage" || quotedMsg?.type === "conversation")) {
        inputText = quotedMsg?.body;
      } else if (args.length > 0) {
        inputText = args.join(' ');
      } else {
        return await sReply("Berikan teks atau balas stiker/teks yang ingin diubah menjadi gambar.");
      }
      if (inputText.length > 200) return await sReply("Teks terlalu panjang! Maksimal 200 karakter.");
      const buffer = await bratGenerator(inputText);
      const resultBuffer = Buffer.from(buffer, 'base64');
      await fn.sendMediaFromBuffer(toId, 'image/jpeg', resultBuffer, dbSettings.autocommand, m);
    }
  }
};