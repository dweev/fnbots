// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import sizeOf from 'image-size';
import { convertMedia as upscaleNative } from '../../addon/bridge.js';

export const command = {
  name: 'upscale',
  category: 'convert',
  description: 'Upscale gambar menggunakan native addon (Lanczos)',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, quotedMsg, sReply }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mimeType = targetMsg?.imageMessage?.mimetype;
    if (!mimeType) return await sReply('Kirim atau balas pesan gambar untuk di-upscale.');
    const media = await fn.getMediaBuffer(targetMsg);
    if (!media) return await sReply('Gagal mengunduh media.');
    const dimensions = sizeOf(media);
    const { width, height } = dimensions;
    const TARGET_RESOLUTION = 4096;
    if (width >= TARGET_RESOLUTION || height >= TARGET_RESOLUTION) return await sReply("Gambar ini sudah memiliki resolusi tinggi, tidak perlu di-upscale.");
    const scaleX = TARGET_RESOLUTION / width;
    const scaleY = TARGET_RESOLUTION / height;
    const scaleFactor = Math.min(scaleX, scaleY, 9);
    const outputBuffer = upscaleNative(media, {
      scale: scaleFactor,
      quality: 1
    });
    await fn.sendMessage(toId, {
      image: outputBuffer,
      caption: `Upscaled ${scaleFactor.toFixed(2)}x menggunakan Lanczos filter`
    }, {
      quoted: m,
      ephemeralExpiration: m.expiration || 0
    });
  }
};