// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { bratGenerator } from 'qc-generator-whatsapp';
import { webpFormatter } from '../../function/index.js';

export const command = {
  name: 'brat',
  category: 'convert',
  description: 'Membuat brat dari teks',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sReply, sendRawWebpAsSticker, arg }) => {
    let inputText;
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      inputText = quotedMsg?.body;
    } else if (arg.length > 0) {
      inputText = arg;
    } else {
      return await sReply("Teks input tidak ditemukan. Balas sebuah pesan atau ketik teks setelah perintah.");
    }
    if (inputText.length > 200) return await sReply("Teks terlalu panjang (maksimal 200 karakter).");
    const highlightRegex = /(?:--|—)\S+/g;
    const matches = inputText.match(highlightRegex) || [];
    const cleanedArray = matches.map(word => {
      return word.startsWith('--') ? word.slice(2) : word.slice(1);
    });
    const cleanedString = inputText.replace(highlightRegex, (match) => {
      return match.startsWith('--') ? match.slice(2) : match.slice(1);
    });
    const buffer = await bratGenerator(cleanedString, cleanedArray);
    const webpSticker = await webpFormatter(buffer, "contain");
    await sendRawWebpAsSticker(webpSticker);
  }
};