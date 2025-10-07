// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { createCanvas, loadImage } from 'canvas';
import { wrapText } from '../../function/index.js';

export const command = {
  name: 'alert',
  category: 'image',
  description: 'Add alert effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin dijadikan alert.`);
    const base = await loadImage(await fs.readFile('./src/image/alert.png'));
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base, 0, 0);
    ctx.font = '30px SF Pro';
    ctx.fillStyle = '#1f1f1f';
    ctx.textBaseline = 'top';
    let text = await wrapText(ctx, arg, 540);
    text = text.length > 3 ? `${text.slice(0, 3).join('\n')}...` : text.join('\n');
    ctx.fillText(text, 48, 178);
    const resBuffer = canvas.toBuffer();
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resBuffer, dbSettings.autocommand, m);
  }
};