// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { generateFakeTweet } from 'generator-fake';
import { colorNameMap } from '../../function/index.js';

export const command = {
  name: 'faketweet',
  category: 'convert',
  description: 'Membuat Fake Tweet',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, arg, sReply, pushname, serial, dbSettings, m, quotedMsg, quotedParticipant }) => {
    let bgColor;
    let inputText = arg;
    const hexColorRegex = /^#([0-9A-F]{3,4}){1,2}$/i;
    if (arg.includes('|')) {
      const parts = arg.split('|');
      const colorArg = parts[0].trim().toLowerCase();
      const potentialText = parts.slice(1).join('|').trim();
      if (colorNameMap[colorArg]) {
        bgColor = colorNameMap[colorArg];
        inputText = potentialText;
      } else if (hexColorRegex.test(colorArg)) {
        bgColor = colorArg;
        inputText = potentialText;
      }
    }
    if (!inputText && quotedMsg) {
      inputText = quotedMsg?.body;
    }
    if (!inputText) return await sReply(`Format salah.\n\nContoh:\n.faketweet [warna] | [teks]\n\nAnda juga bisa membalas pesan.`);
    if (inputText.length > 2048) return await sReply("Teks terlalu panjang!");
    let ppBuffer;
    try {
      if (quotedMsg) {
        ppBuffer = await fn.profileImageBuffer(quotedParticipant, 'image');
      } else {
        ppBuffer = await fn.profileImageBuffer(serial, 'image');
      }
    } catch {
      ppBuffer = await fs.readFile('./src/media/fotobot.jpeg');
    }
    let username = pushname;
    let userid = null;
    if (quotedMsg) {
      userid = quotedParticipant;
      username = await fn.getName(userid);
    }
    const resultBuffer = await generateFakeTweet({
      avatarUrl: ppBuffer,
      user: {
        displayName: username,
        username: username.toLowerCase().replace(/\s/g, '_')
      },
      comment: inputText,
      verified: true,
      backgroundColor: bgColor
    });
    if (!resultBuffer) return await sReply("Gagal membuat gambar tweet (modul mengembalikan null).");
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resultBuffer, dbSettings.autocommand, m);
  }
};