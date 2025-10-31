// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { createCanvas, loadImage } from 'canvas';

export const command = {
  name: 'nowplaying',
  category: 'image',
  description: 'Add nowplaying effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    if (!arg) return await sReply(`Mohon berikan teks dengan format "Nama Lagu | Artis".`);
    const name = arg.split('|')[0];
    const artist = arg.split('|')[1];
    const base = await loadImage(await fs.readFile('./src/image/spotify-now-playing.png'));
    const data = await loadImage(await fs.readFile('./src/image/fnbots.jpeg'));
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, base.width, base.height);
    const height = 504 / data.width;
    ctx.drawImage(data, 66, 132, 504, height * data.height);
    ctx.drawImage(base, 0, 0);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.font = 'normal bold 25px Noto';
    ctx.fillStyle = 'white';
    ctx.fillText(name, base.width / 2, 685);
    ctx.fillStyle = '#bdbec2';
    ctx.font = '20px Noto';
    ctx.fillText(artist, base.width / 2, 720);
    ctx.fillText("FNBot's Picks", base.width / 2, 65);
    const resBuffer = canvas.toBuffer();
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resBuffer, dbSettings.autocommand, m);
  }
};
