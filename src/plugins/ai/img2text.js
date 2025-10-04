// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import FileType from 'file-type';
import config from '../../../config.js';
import { safetySettings } from '../../function/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const command = {
  name: 'img2text',
  displayName: 'gemini-img2text',
  category: 'ai',
  description: 'Ask Gemini something.',
  isLimitCommand: true,
  aliases: ['gemini-img2text', 'ocr'],
  execute: async ({ fn, m, quotedMsg, sReply }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mimeType = targetMsg?.imageMessage?.mimetype;
    if (!mimeType) return await sReply('Balas sebuah gambar, atau kirim gambar dengan caption perintah ini.');
    const mediaBuffer = await fn.getMediaBuffer(targetMsg);
    if (!mediaBuffer) return await sReply('Gagal mengunduh media gambar.');
    const fileType = await FileType.fromBuffer(mediaBuffer);
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!fileType || !supportedTypes.includes(fileType.mime)) return await sReply(`Tipe file tidak didukung. Diketahui: ${fileType?.mime || 'tidak diketahui'}`);
    const genAI = new GoogleGenerativeAI(config.geminiApikey);
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-1.5-flash",
        generationConfig: {
          responseModalities: ['TEXT']
        },
        safetySettings,
      }
    );
    const promptParts = [
      {
        text: "Tolong lakukan OCR penuh. Hasil harus persis semua teks yang terlihat di gambar termasuk yang tidak jelas atau didalam logo. Jangan berikan penjelasan, hanya teks hasil OCR."
      },
      {
        inlineData: {
          mimeType: fileType.mime,
          data: mediaBuffer.toString('base64')
        }
      }
    ];
    const result = await model.generateContent(promptParts);
    const response = result.response;
    const textOutput = response.text();
    if (!textOutput) return await sReply("AI tidak berhasil membaca teks dari gambar.");
    await sReply(textOutput);
  }
};