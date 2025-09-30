// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { letterTrans } from 'custom-translate';

const emoju = { "a": "🇦", "b": "🇧", "c": "🇨", "d": "🇩", "e": "🇪", "f": "🇫", "g": "🇬", "h": "🇭", "i": "🇮", "j": "🇯", "k": "🇰", "l": "🇱", "m": "🇲", "n": "🇳", "o": "🇴", "p": "🇵", "q": "🇶", "r": "🇷", "s": "🇸", "t": "🇹", "u": "🇺", "v": "🇻", "w": "🇼", "x": "🇽", "y": "🇾", "z": "🇿", "0": "0️⃣", "1": "1️⃣", "2": "2️⃣", "3": "3️⃣", "4": "4️⃣", "5": "5️⃣", "6": "6️⃣", "7": "7️⃣", "8": "8️⃣", "9": "9️⃣", "#": "#️⃣", "?": "❓", "!": "❗" };

export const command = {
  name: 'emojify',
  category: 'text',
  description: 'Mengubah teks menjadi emoju',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sReply, arg }) => {
    let d
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      d = quotedMsg?.body
    } else if (arg.length > 0) {
      d = arg
    } else {
      return await sReply(`Mohon berikan teks yang ingin diubah ke Emojify.`);
    }
    await sReply(letterTrans(d, emoju));
  }
};