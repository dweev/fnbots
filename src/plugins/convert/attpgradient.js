// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { attpGradientGenerate } from 'attp-generator';
import { randomChoice } from '../../function/index.js';

export const command = {
  name: 'attpgradient',
  displayName: 'attp-gradient',
  category: 'convert',
  description: 'Animated Text To PNG Gradient plugins',
  aliases: ['attp-gradient'],
  isCommandWithoutPayment: true,
  execute: async ({ quotedMsg, sendRawWebpAsSticker, arg, sReply, dbSettings }) => {
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
    const fireColors = ['#FF4E50', '#F9D423', '#FF2400'];
    const oceanColors = ['#1D2B64', '#3F51B1', '#2196F3', '#4CAF50'];
    const synthwaveColors = ['#F72585', '#B5179E', '#7209B7', '#3A0CA3', '#4361EE', '#4CC9F0'];
    const pastelColors = ['#FADADD', '#FAD3E8', '#E6E6FA', '#D4F0F0', '#B0E0E6'];
    const rainbowColors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
    const colors = [
      "#26c4dc", "#792138",
      "#8b6990", "#f0b330",
      "#ae8774", "#5696ff",
      "#ff7b6b", "#57c9ff",
      "#243640", "#b6b327",
      "#c69fcc", "#54c265",
      "#6e257e", "#c1a03f",
      "#90a841", "#7acba5",
      "#8294ca", "#a62c71",
      "#ff8a8c", "#7e90a3",
      "#74676a"
    ];
    const randomColors = [fireColors, oceanColors, synthwaveColors, pastelColors, rainbowColors, colors];
    const hasilRandomColors = randomChoice(randomColors);
    const result = await attpGradientGenerate(text, hasilRandomFonts, hasilRandomColors);
    await sendRawWebpAsSticker(result, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
  }
};