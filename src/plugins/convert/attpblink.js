// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { attpBlinkGenerate } from 'attp-generator';
import { randomChoice } from '../../function/index.js';

export const command = {
  name: 'attpblink',
  displayName: 'attp-blink',
  category: 'convert',
  description: 'Animated Text To PNG Blinking plugins',
  aliases: ['attp-blink'],
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
    const result = await attpBlinkGenerate(text, hasilRandomFonts);
    await sendRawWebpAsSticker(result);
  }
};