// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import { tmpDir } from '../../lib/tempManager.js';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const ttsId = require('node-gtts')('id');

export const command = {
  name: 'totts',
  displayName: 'to-tts',
  category: 'audio',
  description: 'Menambahkan efek pada audio menggunakan ffmpeg.',
  aliases: ['to-tts'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, toId, args, sReply }) => {
    let inputText;
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      inputText = quotedMsg?.body;
    } else if (args.length > 0) {
      inputText = args.join(' ');
    } else {
      return await sReply("Silakan berikan teks atau balas pesan yang ingin diubah menjadi suara.");
    }
    if (inputText.length >= 500) return await sReply('Teks terlalu panjang! Maksimal 500 karakter untuk menghindari spam.');
    const tempFilePath = tmpDir.createTempFile('mp3');
    const saveTtsAsync = util.promisify(ttsId.save);
    await saveTtsAsync(tempFilePath, inputText);
    await fn.sendFilePath(toId, `tts-${Date.now()}.mp3`, tempFilePath, { quoted: m });
  }
};