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
  name: 'danger',
  category: 'image',
  description: 'Add danger effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin diubah ke Danger.`);
    const text = arg;
    const base = await loadImage(await fs.readFile('./src/image/danger.png'));
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(base, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'normal bold 60px Noto';
    let fontSize = 60;
    while (ctx.measureText(text).width > 2520) {
      fontSize--;
      ctx.font = `normal bold ${fontSize}px Noto`;
    }
    const lines = await wrapText(ctx, text.toUpperCase(), 840);
    const topMost = 510 - ((fontSize * lines.length) / 2 + (20 * (lines.length - 1)) / 2);
    for (let i = 0; i < lines.length; i++) {
      const height = topMost + (fontSize + 20) * i;
      ctx.fillText(lines[i], base.width / 2, height);
    }
    const resBuffer = canvas.toBuffer();
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resBuffer, dbSettings.autocommand, m);
  }
};
