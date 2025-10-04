// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { createCanvas, loadImage } from 'canvas';
import { saveFile } from '../../function/index.js';

export const command = {
  name: 'license',
  category: 'image',
  description: 'Add license-plate effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin diubah ke License Plate.`);
    const text = arg;
    const base = await loadImage(await fs.readFile('./src/image/license-plate.png'));
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '180px License Plate';
    ctx.fillText(text.toUpperCase(), base.width / 2, base.height / 2, 700);
    const resBuffer = canvas.toBuffer();
    const tempFilePath = await saveFile(resBuffer, "license-in", 'jpg');
    await fn.sendFilePath(toId, dbSettings.autocommand, tempFilePath, { quoted: m });
    await fs.unlink(tempFilePath);
  }
};