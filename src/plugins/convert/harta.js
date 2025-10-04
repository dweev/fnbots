// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { runJob } from '../../worker/worker_manager.js';

export const command = {
  name: 'harta',
  category: 'convert',
  description: 'Membuat sticker HARTA TAHTA dengan teks kustom menggunakan ImageMagick.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, args, toId, sReply, dbSettings }) => {
    if (args.length === 0) return await sReply(`Teks tidak boleh kosong.\nGunakan format: ${dbSettings.sname}harta NAMA`);
    const text = args[0].toUpperCase();
    if (text.length > 8) return await sReply(`Teks terlalu panjang! Maksimal 8 huruf.`);
    if (/[^A-Z]/.test(text)) return await sReply(`Teks hanya boleh berisi huruf A-Z.`);
    const resultBuffer = await runJob('imageGenerator', {
      type: 'harta',
      text1: text,
      outputFormat: 'webp'
    });
    const outputBuffer = Buffer.isBuffer(resultBuffer) ? resultBuffer : Buffer.from(resultBuffer.data || resultBuffer);
    await fn.sendMessage(toId, { sticker: outputBuffer }, { quoted: m });
  }
};