// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { createCanvas, loadImage } from 'canvas';
import { wrapText, saveFile } from '../../function/index.js';

export const command = {
  name: 'caution',
  category: 'image',
  description: 'Add caution effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin diubah ke Caution.`);
    const text = arg;
    const base = await loadImage(await fs.readFile('./src/image/caution.png'));
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'normal bold 60px Noto';
    let fontSize = 60;
    while (ctx.measureText(text).width > 3311) {
      fontSize--;
      ctx.font = `normal bold ${fontSize}px Noto`;
    }
    const lines = await wrapText(ctx, text.toUpperCase(), 895);
    const topMost = 470 - (((fontSize * lines.length) / 2) + ((20 * (lines.length - 1)) / 2));
    for (let i = 0; i < lines.length; i++) {
      const height = topMost + ((fontSize + 20) * i);
      ctx.fillText(lines[i], base.width / 2, height);
    }
    const resBuffer = canvas.toBuffer();
    const tempFilePath = await saveFile(resBuffer, "caution-in", 'jpg');
    await fn.sendFilePath(toId, dbSettings.autocommand, tempFilePath, { quoted: m });
    await fs.unlink(tempFilePath);
  }
};