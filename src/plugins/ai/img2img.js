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
  name: 'img2img',
  displayName: 'gemini-img2img',
  category: 'ai',
  description: 'Ask Gemini something.',
  isLimitCommand: true,
  aliases: ['gemini-img2img'],
  execute: async ({ fn, toId, m, quotedMsg, arg, dbSettings, sReply }) => {
    let finalImagePath = '';
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mimeType = targetMsg?.imageMessage?.mimetype;
    if (!mimeType) return await sReply('Balas sebuah gambar, atau kirim gambar dengan caption perintah ini.');
    const userPrompt = arg.trim();
    const defaultPrompt = 'Tingkatkan kualitas gambar ini, buat lebih tajam dan cerah.';
    const finalPrompt = userPrompt || defaultPrompt;
    const mediaBuffer = await fn.getMediaBuffer(targetMsg);
    if (!mediaBuffer) return await sReply('Gagal mengunduh media gambar.');
    const fileType = await FileType.fromBuffer(mediaBuffer);
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!fileType || !supportedTypes.includes(fileType.mime)) return await sReply(`Tipe file tidak didukung. Terdeteksi: ${fileType?.mime || 'tidak diketahui'}`);
    const genAI = new GoogleGenerativeAI(config.geminiApikey);
    const model = genAI.getGenerativeModel({
      generationConfig: { responseModalities: ['Text', 'Image'] },
      model: "gemini-2.0-flash-exp-image-generation",
      safetySettings,
    });
    const promptParts = [
      { text: finalPrompt },
      { inlineData: { mimeType: fileType.mime, data: mediaBuffer.toString('base64') } }
    ];
    const result = await model.generateContent(promptParts);
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      const feedback = response.text();
      return await sReply(`AI tidak memberikan respons valid. Feedback: ${feedback || 'Tidak ada.'}`);
    }
    let generatedText = '';
    let imageGenerated = false;
    for (const part of parts) {
      if (part.text) {
        generatedText += part.text;
      }
      if (part.inlineData) {
        finalImagePath = Buffer.from(part.inlineData.data, 'base64');
        imageGenerated = true;
      }
    }
    if (!imageGenerated && !generatedText) return await sReply('AI tidak menghasilkan gambar atau teks yang dapat ditampilkan.');
    if (finalImagePath) {
      await fn.sendMediaFromBuffer(toId, 'image/jpeg', finalImagePath, dbSettings.autocommand, m);
    } else if (generatedText) {
      await sReply(generatedText);
    }
  }
};