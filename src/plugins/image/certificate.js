// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import dayjs from '../../utils/dayjs.js';
import { createCanvas, loadImage } from 'canvas';
import { saveFile } from '../../function/index.js';

export const command = {
  name: 'certificate',
  category: 'image',
  description: 'Add certificate effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    if (!arg) return await sReply(`Mohon berikan teks dengan format "Nama | Alasan".`);
    const name = arg.split('|')[0].trim();
    const reason = arg.split('|')[1].trim();
    const base = await loadImage(await fs.readFile('./src/image/certificate.png'));
    const canvas = createCanvas(base.width, base.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(base, 0, 0)
    ctx.font = '30px Old English Text MT';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillText(reason, 518, 273);
    ctx.fillText(name, 518, 419);
    ctx.fillText(dayjs().format('MM/DD/YYYY'), 309, 503);
    const resBuffer = canvas.toBuffer();
    const tempFilePath = await saveFile(resBuffer, "certificate-in", 'jpg');
    await fn.sendFilePath(toId, dbSettings.autocommand, tempFilePath, { quoted: m });
    await fs.unlink(tempFilePath);
  }
};