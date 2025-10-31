// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import path from 'path';
import fs from 'fs-extra';
import config from '../../../config.js';
import { colorNameMap, getContrastColor } from '../../function/index.js';
import { bratVidGenerator, generateAnimatedBratVid } from 'qc-generator-whatsapp';

export const command = {
  name: 'bratvid',
  category: 'convert',
  description: 'Membuat bratvid dari teks',
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sendRawWebpAsSticker, sReply, dbSettings, arg }) => {
    let tempFrameDir = '';
    let outputPath = '';
    try {
      let bgColor = '#FFFFFF';
      let inputText = '';
      const hexColorRegex = /^#([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;
      if (arg.includes('|')) {
        const parts = arg.split('|');
        const colorArg = parts[0].trim().toLowerCase();
        inputText = parts.slice(1).join('|').trim();
        if (colorNameMap[colorArg]) {
          bgColor = colorNameMap[colorArg];
        } else if (hexColorRegex.test(colorArg)) {
          bgColor = colorArg;
        } else {
          return await sReply(`Warna "${parts[0].trim()}" tidak dikenali. Gunakan nama warna dasar (merah, pink, ungu, biru, indigo, toska, hijau, kuning, oranye, putih, hitam, abu) atau kode hex (#RRGGBB).`);
        }
      } else {
        inputText = arg;
      }
      if (!inputText && quotedMsg) {
        if (quotedMsg?.type === 'extendedTextMessage' || quotedMsg?.type === 'conversation') {
          inputText = quotedMsg?.body;
        }
      }
      if (!inputText) return await sReply(`Format salah.\n\nContoh:\n1. ${dbSettings.rname}bratvid teks kamu\n2. ${dbSettings.rname}bratvid biru | teks kamu\n3. ${dbSettings.rname}bratvid #FF9800 | teks kamu`);
      if (inputText.length > 200) return await sReply('Teks terlalu panjang! Maksimal 200 karakter.');
      const textColor = getContrastColor(bgColor);
      const highlightRegex = /(?:--|—)\S+/g;
      const matches = inputText.match(highlightRegex) || [];
      const cleanedArray = matches.map((word) => {
        return word.startsWith('--') ? word.slice(2) : word.slice(1);
      });
      const cleanedString = inputText.replace(highlightRegex, (match) => {
        return match.startsWith('--') ? match.slice(2) : match.slice(1);
      });
      const frameFiles = [];
      const frames = await bratVidGenerator(cleanedString, 512, 512, bgColor, textColor, cleanedArray);
      tempFrameDir = await fs.mkdtemp(path.join(config.paths.tempDir, 'bratvid-frames-'));
      outputPath = path.join(tempFrameDir, `${global.randomSuffix}.webp`);
      for (let i = 0; i < frames.length; i++) {
        const framePath = path.join(tempFrameDir, `frame_${i}.png`);
        await fs.writeFile(framePath, frames[i]);
        frameFiles.push(framePath);
      }
      await generateAnimatedBratVid(tempFrameDir, outputPath);
      await sendRawWebpAsSticker(outputPath, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
    } finally {
      if (tempFrameDir) {
        await fs.rm(tempFrameDir, { recursive: true, force: true });
      }
    }
  }
};
