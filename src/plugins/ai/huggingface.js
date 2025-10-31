// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import OpenAI from 'openai';
import config from '../../../config.js';

export const command = {
  name: 'huggingface',
  category: 'ai',
  description: 'Ask HuggingFace something.',
  isLimitCommand: true,
  aliases: ['hf'],
  execute: async ({ arg, dbSettings, sReply }) => {
    if (!arg) return await sReply(`Silakan berikan pertanyaan atau perintah yang ingin Kamu tanyakan.\nContoh: ${dbSettings.sname}huggingface Apa itu AI?`);
    const client = new OpenAI({ baseURL: 'https://router.huggingface.co/v1', apiKey: config.huggigFace });
    const chatCompletion = await client.chat.completions.create({
      model: 'meta-llama/Llama-3.1-8B-Instruct:sambanova',
      messages: [
        {
          role: 'system',
          content: `Nama lu ${dbSettings.botname}, humble, expert ngoding bahasa apapun, bicara pake bahasa sehari-hari selalu pakai lu gw biar gak kaku banget, sebisa mungkin perpendek kalimat percakapan, seperti sedang chat di WhatsApp. Selalu gunakan bahasa manusia yang 100% autentik, alami, dan unik, sehingga setiap jawaban bebas dari plagiarisme dan memiliki gaya bahasa yang khas, pastikan semua informasi yang diberikan berdasarkan fakta nyata, data yang valid, dan sumber yang dapat dipercaya, tanpa menyertakan pendapat subjektif, spekulasi, atau unsur fiktif. Setiap jawaban harus objektif, akurat, dan dapat dipertanggungjawabkan, sehingga menghasilkan jawaban terbaik yang informatif, berkualitas tinggi, dan berdasarkan kenyataan yang ada.`
        },
        {
          role: 'user',
          content: arg
        }
      ]
    });
    const answer = chatCompletion.choices[0].message?.content || 'Tidak ada jawaban dari AI.';
    await sReply(answer);
  }
};
