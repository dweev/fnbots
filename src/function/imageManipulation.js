// ─── Info ───────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/imageManipulation.js ─────────────

import fs from 'fs-extra';
import sharp from 'sharp';
import { randomChoice } from './index.js';
import { createCanvas, loadImage, registerFont } from 'canvas';

registerFont('./src/fonts/Noto-Bold.ttf', { family: 'Noto', weight: 'bold' });
registerFont('./src/fonts/SF-Pro-Display-Medium.otf', { family: 'SF Pro' });
registerFont('./src/fonts/oldengl.ttf', { family: 'Old English Text MT' });
registerFont('./src/fonts/LicensePlate.ttf', { family: 'License Plate' });
registerFont('./src/fonts/Noto-Regular.ttf', { family: 'Noto' });

function clamp(v) {
  return Math.max(0, Math.min(255, v));
};
function drawImageWithTint(ctx, image, color, x, y, width, height) {
  safeDraw(ctx, () => {
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(image, x, y, width, height);
    ctx.fillRect(x, y, width, height);
  });
};
function applyPixelOperation(ctx, x, y, width, height, pixelFn) {
  const img = ctx.getImageData(x, y, width, height);
  const { data } = img;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    const [nr, ng, nb, na] = pixelFn(r, g, b, a, i) || [r, g, b, a];
    data[i] = clamp(nr);
    data[i + 1] = clamp(ng);
    data[i + 2] = clamp(nb);
    data[i + 3] = clamp(na ?? a);
  }
  ctx.putImageData(img, x, y);
  return ctx;
};
function safeDraw(ctx, drawFn) {
  ctx.save();
  drawFn(ctx);
  ctx.restore();
};
function greyscale(ctx, x, y, width, height) {
  return applyPixelOperation(ctx, x, y, width, height, (r, g, b) => {
    const brightness = (0.34 * r) + (0.5 * g) + (0.16 * b);
    return [brightness, brightness, brightness];
  });
};
function contrast(ctx, x, y, width, height, contrastLevel = 100) {
  const factor = (259 * (contrastLevel + 255)) / (255 * (259 - contrastLevel));
  const intercept = 128 * (1 - factor);
  return applyPixelOperation(ctx, x, y, width, height, (r, g, b) => [
    (r * factor) + intercept,
    (g * factor) + intercept,
    (b * factor) + intercept
  ]);
};
function desaturate(ctx, level, x, y, width, height) {
  return applyPixelOperation(ctx, x, y, width, height, (r, g, b) => {
    const grey = (0.2125 * r) + (0.7154 * g) + (0.0721 * b);
    return [
      r + level * (grey - r),
      g + level * (grey - g),
      b + level * (grey - b)
    ];
  });
};
function distort(ctx, amplitude, x, y, width, height, strideLevel = 4) {
  const img = ctx.getImageData(x, y, width, height);
  const temp = ctx.getImageData(x, y, width, height);
  const stride = width * strideLevel;
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const xs = Math.round(amplitude * Math.sin(2 * Math.PI * 3 * (j / height)));
      const ys = Math.round(amplitude * Math.cos(2 * Math.PI * 3 * (i / width)));
      const dest = (j * stride) + (i * strideLevel);
      const srcX = Math.max(0, Math.min(i + xs, width - 1));
      const srcY = Math.max(0, Math.min(j + ys, height - 1));
      const src = (srcY * stride) + (srcX * strideLevel);
      img.data[dest] = temp.data[src];
      img.data[dest + 1] = temp.data[src + 1];
      img.data[dest + 2] = temp.data[src + 2];
    }
  }
  ctx.putImageData(img, x, y);
  return ctx;
};
function fishEye(ctx, level, x, y, width, height) {
  const img = ctx.getImageData(x, y, width, height);
  const source = new Uint8ClampedArray(img.data);
  for (let i = 0; i < img.data.length; i += 4) {
    const sx = (i / 4) % img.width;
    const sy = Math.floor(i / 4 / img.width);
    const dx = Math.floor(img.width / 2) - sx;
    const dy = Math.floor(img.height / 2) - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const x2 = Math.round(img.width / 2 - dx * Math.sin(dist / (level * Math.PI) / 2));
    const y2 = Math.round(img.height / 2 - dy * Math.sin(dist / (level * Math.PI) / 2));
    const i2 = (y2 * img.width + x2) * 4;
    if (x2 >= 0 && x2 < img.width && y2 >= 0 && y2 < img.height) {
      img.data[i] = source[i2];
      img.data[i + 1] = source[i2 + 1];
      img.data[i + 2] = source[i2 + 2];
      img.data[i + 3] = source[i2 + 3];
    }
  }
  ctx.putImageData(img, x, y);
  return ctx;
};
async function prepareCanvas(buffer) {
  return loadImage(buffer).then(data => {
    const canvas = createCanvas(data.width, data.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(data, 0, 0);
    return { canvas, ctx, data };
  });
};
async function applyEffect(buffer, effectFn) {
  const { canvas, ctx, data } = await prepareCanvas(buffer);
  await effectFn(ctx, data.width, data.height);
  return canvas.toBuffer();
};
async function overlayImage(ctx, baseImagePath, data, position = 'center') {
  const base = await loadImage(await fs.readFile(baseImagePath));
  let x = 0, y = 0, width = base.width, height = base.height;
  const dataRatio = data.width / data.height;
  const baseRatio = base.width / base.height;
  if (baseRatio < dataRatio) {
    height = data.height;
    width = base.width * (height / base.height);
  } else {
    width = data.width;
    height = base.height * (width / base.width);
  }
  switch (position) {
    case 'center':
      x = (data.width - width) / 2;
      y = (data.height - height) / 2;
      break;
    case 'top-left':
      x = 0;
      y = 0;
      break;
    case 'bottom-left':
      x = 0;
      y = data.height - height;
      break;
    case 'bottom-right':
      x = data.width - width;
      y = data.height - height;
      break;
  }
  ctx.drawImage(base, x, y, width, height);
};

export function wrapText(ctx, text, maxWidth) {
  return new Promise(resolve => {
    if (ctx.measureText(text).width < maxWidth) return resolve([text]);
    if (ctx.measureText('W').width > maxWidth) return resolve(null);
    const words = text.split(' ');
    const lines = [];
    let line = '';
    while (words.length > 0) {
      let split = false;
      while (ctx.measureText(words[0]).width >= maxWidth) {
        const temp = words[0];
        words[0] = temp.slice(0, -1);
        if (split) {
          words[1] = `${temp.slice(-1)}${words[1]}`;
        } else {
          split = true;
          words.splice(1, 0, temp.slice(-1));
        }
      }
      if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) {
        line += `${words.shift()} `;
      } else {
        lines.push(line.trim());
        line = '';
      }
      if (words.length === 0) lines.push(line.trim());
    }
    return resolve(lines);
  });
};
export const deepfry = (buffer) => applyEffect(buffer, (ctx, w, h) => {
  desaturate(ctx, -20, 0, 0, w, h);
  contrast(ctx, 0, 0, w, h);
});
export const glitch = (buffer) => applyEffect(buffer, (ctx, w, h) => {
  distort(ctx, 20, 0, 0, w, h, 5);
});
export const mataikan = (buffer) => applyEffect(buffer, (ctx, w, h) => {
  fishEye(ctx, 15, 0, 0, w, h);
});
export const mirror = (buffer) => applyEffect(buffer, (ctx, w, h) => {
  const type = randomChoice(['x', 'y', 'both']);
  safeDraw(ctx, () => {
    if (type === 'x') ctx.transform(-1, 0, 0, 1, w, 0);
    else if (type === 'y') ctx.transform(1, 0, 0, -1, 0, h);
    else ctx.transform(-1, 0, 0, -1, w, h);
    ctx.drawImage(ctx.canvas, 0, 0);
  });
});
export const approved = (buffer) => applyEffect(buffer, async (ctx, w, h) => {
  await overlayImage(ctx, './src/image/approved.png', { width: w, height: h });
});
export const rejected = (buffer) => applyEffect(buffer, async (ctx, w, h) => {
  await overlayImage(ctx, './src/image/rejected.png', { width: w, height: h });
});
export const thuglife = (buffer) => applyEffect(buffer, async (ctx, w, h) => {
  greyscale(ctx, 0, 0, w, h);
  const base = await loadImage(await fs.readFile('./src/image/thug-life.png'));
  const ratio = base.width / base.height;
  const width = w / 2;
  const height = Math.round(width / ratio);
  ctx.drawImage(base, (w / 2) - (width / 2), h - height, width, height);
});
export const tobecontinue = (buffer) => applyEffect(buffer, async (ctx, w, h) => {
  drawImageWithTint(ctx, ctx.canvas, '#704214', 0, 0, w, h);
  await overlayImage(ctx, './src/image/to-be-continued.png', { width: w, height: h }, 'bottom-left');
});
export const subtitle = (buffer, text) => applyEffect(buffer, async (ctx, w, h) => {
  const fontSize = Math.round(h / 15);
  ctx.font = `${fontSize}px Noto`;
  ctx.fillStyle = 'yellow';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const lines = await wrapText(ctx, text, w - 10);
  if (!lines) throw new Error('Not enough width to subtitle this image.');
  const startY = h - ((lines.length - 1) * fontSize) - (fontSize / 2) - ((lines.length - 1) * 10);
  lines.forEach((line, i) => {
    const y = startY + (i * fontSize) + (i * 10);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = Math.max(1, Math.round(h / 100));
    ctx.strokeText(line, w / 2, y);
    ctx.fillText(line, w / 2, y);
  });
});
export const burn = (text) => applyEffect('./src/image/spongebob-burn.png', async (ctx) => {
  ctx.fillStyle = 'black';
  ctx.textBaseline = 'top';
  let fontSize = 35;
  ctx.font = `${fontSize}px Noto`;
  while (ctx.measureText(text).width > 400) {
    fontSize--;
    ctx.font = `${fontSize}px Noto`;
  }
  const lines = await wrapText(ctx, text, 180);
  ctx.fillText(lines.join('\n'), 55, 103);
});
export const blur = async (buffer, kontol) => {
  try {
    const blurredImage = await sharp(buffer)
      .blur(parseInt(kontol))
      .toBuffer();
    return blurredImage;
  } catch (error) {
    throw new Error(`Error Blur:\n${error}`, true);
  }
};
export const ghost = async (buffer) => {
  try {
    const data = await loadImage(buffer);
    const canvas = createCanvas(data.width, data.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, data.width, data.height);
    ctx.globalAlpha = 0.25;
    ctx.drawImage(data, 0, 0);
    return canvas.toBuffer();
  } catch (error) {
    throw new Error(`Error ghost:\n${error}`, true);
  }
};
