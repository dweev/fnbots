// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { attpWalkingGenerate } from 'attp-generator';
import { randomChoice } from '../../function/index.js';

export const command = {
  name: 'attpwalking',
  displayName: 'attp-walking',
  category: 'convert',
  description: 'Animated Text To PNG Walking plugins',
  aliases: ['attp-walking'],
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sendRawWebpAsSticker, arg, sReply }) => {
    let text = '';
    const textLimit = 100;
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      text = quotedMsg?.body;
    } else if (arg) {
      text = arg;
    }
    if (!text || text.length >= textLimit) return await sReply(`Teks tidak boleh kosong atau lebih dari ${textLimit} karakter.`);
    const randomFonts = ["SpicyRice", "Bangers"];
    const hasilRandomFonts = randomChoice(randomFonts);
    const result = await attpWalkingGenerate(text, hasilRandomFonts);
    await sendRawWebpAsSticker(result);
  }
};