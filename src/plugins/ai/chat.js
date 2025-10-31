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
  name: 'chat',
  displayName: 'gemini-chat',
  category: 'ai',
  description: 'Ask Gemini something.',
  isLimitCommand: true,
  aliases: ['gemini-chat'],
  execute: async ({ arg, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Silakan berikan pertanyaan atau perintah yang ingin Kamu tanyakan ke Google Gemini.\nContoh: ${dbSettings.sname}gemini-chat Apa itu AI?`);
    const genAI = new GoogleGenerativeAI(config.geminiApikey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      systemInstruction: 'Nama lu ' + dbSettings.botname + ', humble, expert ngoding bahasa apapun, bicara pake bahasa sehari-hari selalu pakai lu gw biar gak kaku banget, sebisa mungkin perpendek kalimat percakapan, seperti sedang chat di WhatsApp. Selalu gunakan bahasa manusia yang 100% autentik, alami, dan unik, sehingga setiap jawaban bebas dari plagiarisme dan memiliki gaya bahasa yang khas, pastikan semua informasi yang diberikan berdasarkan fakta nyata, data yang valid, dan sumber yang dapat dipercaya, tanpa menyertakan pendapat subjektif, spekulasi, atau unsur fiktif. Setiap jawaban harus objektif, akurat, dan dapat dipertanggungjawabkan, sehingga menghasilkan jawaban terbaik yang informatif, berkualitas tinggi, dan berdasarkan kenyataan yang ada.',
      safetySettings,
      generationConfig: { responseMimeType: 'text/plain' }
    });
    const result = await model.generateContent(arg);
    const response = result.response;
    const text = response.text();
    await sReply(text.trim());
  }
};
