// ─── Info ─────────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/worker/workers/group_image_worker.js ────────────────

import fs from 'fs-extra';
import log from '../../lib/logger.js';
import config from '../../../config.js';
import { createCanvas, loadImage } from 'canvas';

async function groupImage(username, groupname, welcometext, profileImagePath) {
  const width = 600;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FF7F00';
  ctx.fillRect(0, 0, width, height);
  const darkAreaHeight = 60;
  const darkAreasY = [30, 120, 210];
  ctx.fillStyle = '#333333';
  for (const y of darkAreasY) {
    ctx.fillRect(0, y, width, darkAreaHeight);
  }
  let profileImage;
  try {
    profileImage = await loadImage(profileImagePath);
  } catch {
    await log(`Tidak bisa load gambar profil, fallback.`);
    profileImage = await loadImage(await fs.readFile(config.paths.avatar));
  }
  const profileSize = 160;
  const profileX = 30;
  const profileY = (height - profileSize) / 2;
  ctx.drawImage(profileImage, profileX, profileY, profileSize, profileSize);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 60;
  const gap = 30;
  const firstLineX = profileX + profileSize;
  const spacing = 90;
  for (let i = 0; i < 3; i++) {
    const offsetX = firstLineX + i * spacing;
    const startX = offsetX;
    const startY = height;
    const endX = offsetX + height;
    const endY = 0;
    ctx.beginPath();
    ctx.moveTo(startX + gap, startY + gap);
    ctx.lineTo(endX - gap, endY - gap);
    ctx.stroke();
  }
  function trimTextToWidth(text, maxWidth) {
    let trimmedText = text;
    while (ctx.measureText(trimmedText).width > maxWidth && trimmedText.length > 0) {
      trimmedText = trimmedText.slice(0, -1);
    }
    if (trimmedText.length < text.length) {
      trimmedText = trimmedText.slice(0, -3) + '...';
    }
    return trimmedText;
  }
  ctx.fillStyle = '#FF7F00';
  ctx.font = '30px sans-serif';
  ctx.textAlign = 'left';
  const textX = profileX + profileSize + 30;
  const maxWidth = width - textX - 20;
  ctx.fillText(trimTextToWidth(welcometext, maxWidth), textX, darkAreasY[0] + 40);
  ctx.fillText(trimTextToWidth('#' + groupname, maxWidth), textX, darkAreasY[1] + 40);
  ctx.fillText(trimTextToWidth('@' + username, maxWidth), textX, darkAreasY[2] + 40);
  return canvas.toBuffer('image/png');
};

export default async function createImage({ username, groupname, welcometext, profileImagePath }) {
  return await groupImage(username, groupname, welcometext, profileImagePath);
}