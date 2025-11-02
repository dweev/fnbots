// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { imageGenerator } from '../../function/index.js';

export const command = {
  name: 'create',
  category: 'convert',
  description: 'Membuat sticker kustom dengan 3 baris teks menggunakan ImageMagick.',
  isCommandWithoutPayment: true,
  execute: async ({ args, arg, sendRawWebpAsSticker, sReply, dbSettings }) => {
    if (!arg || args.length !== 3) return await sReply(`Gunakan format: ${dbSettings.sname}create KATA1 KATA2 KATA3\nContoh: ${dbSettings.sname}create HARTA TAHTA ANIME`);
    const text1 = args[0].toUpperCase();
    const text2 = args[1].toUpperCase();
    const text3 = args[2].toUpperCase();
    if ([text1, text2, text3].some((t) => t.length > 8)) return await sReply('Setiap kata tidak boleh lebih dari 8 huruf.');
    if ([text1, text2, text3].some((t) => /[^A-Z]/.test(t))) return await sReply('Teks hanya boleh berisi huruf A-Z.');
    const resultBuffer = await imageGenerator({
      type: 'create',
      text1: text1,
      text2: text2,
      text3: text3,
      outputFormat: 'webp'
    });
    const outputBuffer = Buffer.isBuffer(resultBuffer) ? resultBuffer : Buffer.from(resultBuffer.data || resultBuffer);
    await sendRawWebpAsSticker(outputBuffer, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
  }
};
