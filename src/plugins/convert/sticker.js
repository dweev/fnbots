// ─── Info ────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────────

import sharp from 'sharp';
import config from '../../../config.js';
import { fetch as nativeFetch } from '../../addon/bridge.js';
import { createNativeSticker } from '../../function/index.js';

export const command = {
  name: 'sticker',
  category: 'convert',
  description: 'Membuat stiker dari gambar atau video (maks 10 detik). Bisa juga dari URL.\nPenggunaan:\n- .s (reply media)\n- .s --crop (dengan crop)\n- .s --rounded 60 (custom rounded corner)\n- .s nama|author\n- .s url --crop\n- .s nama|author --crop --rounded 80',
  aliases: ['s', 'stiker', 'wm'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, args, quotedMsg, sReply }) => {
    const pack = {
      packName: dbSettings.packName,
      authorName: dbSettings.packAuthor,
      crop: false
    };
    let buffer;
    let hasCustomWatermark = false;
    let cornerRadius = 0;
    const hasCropFlag = args.some((a) => a === '--crop');
    if (hasCropFlag) {
      pack.crop = true;
      args = args.filter((a) => a !== '--crop');
    }
    const radiusIndex = args.findIndex((a) => a === '--rounded');
    if (radiusIndex !== -1 && args[radiusIndex + 1]) {
      const radiusValue = parseInt(args[radiusIndex + 1]);
      if (!isNaN(radiusValue) && radiusValue >= 0 && radiusValue <= 256) {
        cornerRadius = radiusValue;
      }
      args.splice(radiusIndex, 2);
    }
    arg = args.join(' ').trim();
    const isURL = args.length > 0 && /^https?:\/\/.+/i.test(args[0]);
    if (isURL) {
      try {
        const response = await nativeFetch(args[0], {
          timeout: config.performance.axiosTimeout
        });
        if (!response.ok) return await sReply(`Gagal mengunduh dari URL: ${response.status} ${response.statusText}`);
        buffer = await response.arrayBuffer();
      } catch (error) {
        return await sReply(`Error mengunduh dari URL: ${error.message}`);
      }
    } else {
      if (arg && arg.includes('|')) {
        const pipeIndex = arg.indexOf('|');
        const leftPart = arg.substring(0, pipeIndex).trim();
        const rightPart = arg.substring(pipeIndex + 1).trim();
        if (leftPart && rightPart) {
          pack.packName = leftPart;
          pack.authorName = rightPart;
          hasCustomWatermark = true;
        } else {
          // prettier-ignore
          return await sReply(
            'Format watermark salah! Pastikan kedua bagian terisi.\n' +
            'Contoh: .s MyPack|FN\n' +
            'Atau reply media tanpa text untuk watermark default.'
          );
        }
      }
      const targetMsg = quotedMsg ? m.quoted || m : m.message;
      if (!targetMsg) {
        // prettier-ignore
        return await sReply(
          "Balas gambar/video atau kirim media dengan caption .sticker\n\n" +
          "Contoh penggunaan:\n" +
          "- .s (reply media)\n" +
          "- .s --crop\n" +
          "- .s --rounded 60\n" +
          "- .s nama|author\n" +
          "- .s https://url.com/image.jpg\n" +
          "- .s nama|author --crop --rounded 80"
        );
      }
      const isMedia = !!(targetMsg.imageMessage || targetMsg.videoMessage || targetMsg.stickerMessage);
      if (!isMedia) return await sReply('Media tidak valid! Pastikan yang Anda balas adalah gambar atau video.');
      buffer = await fn.getMediaBuffer(targetMsg);
      if (targetMsg.mime?.includes('video')) {
        const duration = targetMsg?.videoMessage?.seconds || 0;
        if (duration > 20) return await sReply('Durasi video melebihi 20 detik');
      }
    }
    if (!buffer || buffer.length < 100) return await sReply('Ukuran media tidak valid atau gagal diunduh.');
    const isFromAndroid = m.key?.id?.startsWith('3EB') || false;
    let stickerBuffer;
    try {
      stickerBuffer = await createNativeSticker({
        mediaBuffer: buffer,
        packName: pack.packName,
        authorName: pack.authorName,
        crop: pack.crop,
        cornerRadius: cornerRadius,
        forceUpdateExif: hasCustomWatermark
      });
    } catch {
      if (isFromAndroid) {
        // prettier-ignore
        const pngBuffer = await sharp(buffer).png().toBuffer();
        stickerBuffer = await createNativeSticker({
          mediaBuffer: pngBuffer,
          packName: pack.packName,
          authorName: pack.authorName,
          crop: pack.crop,
          cornerRadius: cornerRadius,
          forceUpdateExif: hasCustomWatermark
        });
      } else {
        return await sReply('Gagal membuat stiker. Coba dengan media yang lebih kecil.');
      }
    }
    if (!Buffer.isBuffer(stickerBuffer) || stickerBuffer.length === 0) return await sReply('Gagal menghasilkan stiker yang valid.');
    await fn.sendMessage(toId, { sticker: stickerBuffer }, { quoted: m, ephemeralExpiration: m.expiration ?? 0 });
  }
};
