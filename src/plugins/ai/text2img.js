// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import config from '../../../config.js';
import { safetySettings } from '../../function/index.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const command = {
  name: 'text2img',
  displayName: 'gemini-text2img',
  category: 'ai',
  description: 'Ask Gemini something.',
  isLimitCommand: true,
  aliases: ['gemini-text2img'],
  execute: async ({ fn, toId, m, arg, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Silakan berikan deskripsi gambar yang ingin dibuat.\nContoh: ${dbSettings.sname}gemini-text2img Pemandangan alam dengan matahari terbenam.`);
    const genAI = new GoogleGenerativeAI(config.geminiApikey);
    const model = genAI.getGenerativeModel({
      generationConfig: { responseModalities: ['Text', 'Image'] },
      model: "gemini-2.0-flash-exp-image-generation",
      safetySettings,
    });
    const result = await model.generateContent(arg);
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      const feedback = response.text();
      return await sReply(`AI tidak menghasilkan output yang valid. Feedback: ${feedback || 'Tidak ada feedback.'}`);
    }
    let imageGenerated = false;
    for (const part of parts) {
      if (part.inlineData) {
        const filePath = Buffer.from(part.inlineData.data, 'base64');
        await fn.sendMediaFromBuffer(toId, 'image/jpeg', filePath, dbSettings.autocommand, m);
        imageGenerated = true;
        break;
      }
    }
    if (!imageGenerated) return await sReply("Gagal membuat gambar. Respons dari AI tidak mengandung data gambar.");
  }
};