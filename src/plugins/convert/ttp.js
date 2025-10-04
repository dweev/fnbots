// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { generateTTP } from 'attp-generator';
import { webpFormatter, randomChoice } from '../../function/index.js';

const warna = ['white', 'teal', 'aqua', 'black', 'silver', 'gray', 'yellow', 'olive', 'lime', 'green', 'fuchsia', 'purple'];
export const command = {
  name: 'ttp',
  category: 'convert',
  description: 'Text To PNG plugins',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sendRawWebpAsSticker, arg, sReply }) => {
    const randomStyle = { color: randomChoice(warna) };
    let inputText;
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      inputText = quotedMsg?.body;
    } else if (arg.length > 0) {
      inputText = arg;
    } else {
      return await sReply("!Error");
    }
    if (inputText.length > 200) return await sReply("!Error");
    const randomFonts = ["SpicyRice", "Bangers"];
    const hasilRandomFonts = randomChoice(randomFonts);
    const result = await generateTTP(inputText, randomStyle, hasilRandomFonts);
    const webpSticker = await webpFormatter(result, "contain");
    await sendRawWebpAsSticker(webpSticker);
  }
};