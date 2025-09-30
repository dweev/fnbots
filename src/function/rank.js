// ─── Info ──────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/lib/function/rank.js ─────────────────

import fs from 'fs-extra';
import log from '../lib/logger.js';
import config from '../../config.js';
import { formatNumber } from './function.js';
import { User } from '../../database/index.js';
import { createCanvas, loadImage } from 'canvas';

function truncateText(ctx, text, maxWidth) {
  let truncated = text;
  while (ctx.measureText(truncated).width > maxWidth) {
    truncated = truncated.slice(0, -1);
    if (truncated.length <= 3) {
      return '...';
    }
  }
  if (truncated !== text) {
    truncated = truncated.slice(0, -3) + '...';
  }
  return truncated;
};
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

async function createBalanceCard({ username, discriminator, avatarUrl, balance }) {
  const width = 600;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1e1e2f');
  gradient.addColorStop(1, '#282841');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  function drawRoundedImage(ctx, img, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }
  const avatarSize = 80;
  let avatar;
  try {
    avatar = await loadImage(avatarUrl);
  } catch {
    avatar = await loadImage(await fs.readFile(config.paths.avatar))
  }
  ctx.save();
  drawRoundedImage(ctx, avatar, 50, (height - avatarSize) / 2, avatarSize, avatarSize, 15);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px Sans';
  let usernameText = username;
  const maxWidth = 180;
  while (ctx.measureText(usernameText).width > maxWidth) {
    usernameText = usernameText.slice(0, -1);
  }
  ctx.fillText(usernameText, 170, 80);
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '18px Sans';
  ctx.fillText(`Role: ${discriminator}`, 170, 105);
  ctx.fillStyle = '#00FF00';
  ctx.font = 'bold 16px Sans';
  const balanceStr = balance.toString()
  const maxBalanceWidth = 257;
  const truncatedBalance = truncateText(ctx, balanceStr, maxBalanceWidth);
  ctx.fillText(`Balance: $${truncatedBalance}`, 170, 140);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(170, 115);
  ctx.lineTo(500, 115);
  ctx.stroke();
  return canvas.toBuffer('image/png');
};
async function createRankCard({ username, discriminator, avatarUrl, level, currentXP, requiredXP, rank, pangkat }) {
  const width = 800;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const bg = await loadImage(config.paths.rank);
  ctx.drawImage(bg, 0, 0, width, height);
  const avatarSize = 180;
  let avatar;
  try {
    avatar = await loadImage(avatarUrl);
  } catch {
    avatar = await loadImage(await fs.readFile(config.paths.avatar));
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(125, 125, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 35, 35, avatarSize, avatarSize);
  ctx.restore();
  const formatter = new Intl.NumberFormat('en-US');
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px Sans';
  let originalText = username.split(' ').slice(0, 4).join(' ');
  let usernameText = originalText;
  const maxWidth = 300;
  while (ctx.measureText(usernameText).width > maxWidth) {
    usernameText = usernameText.slice(0, -1);
    if (usernameText.endsWith(' ')) {
      usernameText = usernameText.trim();
    }
    if (usernameText.length === 0) break;
  }
  if (usernameText !== originalText) {
    usernameText = usernameText.trim() + '…';
  }
  ctx.fillText(usernameText, 250, 80);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '28px Sans';
  ctx.fillText(discriminator, 250, 120);
  ctx.fillStyle = '#FFFF00';
  ctx.font = '24px Sans';
  ctx.fillText(`Role: ${pangkat}`, 250, 150);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '28px Sans';
  ctx.fillText(`Level: ${level}`, 630, 80);
  ctx.fillText(`Rank: #${rank}`, 630, 120);
  const progressWidth = 400;
  const progressHeight = 20;
  const progressX = 250;
  const progressY = 170;
  const progress = Math.min(currentXP / requiredXP, 1);
  ctx.fillStyle = '#555555';
  roundRect(ctx, progressX, progressY, progressWidth, progressHeight, 10);
  ctx.fill();
  let barColor = '#FF0000';
  const progressPercentage = progress * 100;
  if (progressPercentage > 30 && progressPercentage <= 60) barColor = '#00FF00';
  else if (progressPercentage > 60 && progressPercentage <= 90) barColor = '#FFFF00';
  else if (progressPercentage > 90) barColor = '#A8DFFB';
  ctx.fillStyle = barColor;
  roundRect(ctx, progressX, progressY, progressWidth * progress, progressHeight, 10);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '20px Sans';
  ctx.fillText(`${formatter.format(currentXP)} / ${formatter.format(requiredXP)} XP`, 250, 210);
  return canvas.toBuffer('image/png');
};

export async function getMyLevel(user, username, avatarUrl) {
  try {
    const rank = await User.getUserRank(user.userId, 'xp');
    const rankCardBuffer = await createRankCard({
      username: username,
      discriminator: `#${String(user.userId.split('@')[0])}`,
      avatarUrl: avatarUrl,
      level: user.level,
      currentXP: user.xp,
      requiredXP: user.maxXp,
      rank: rank,
      pangkat: user.levelName
    });
    return rankCardBuffer;
  } catch (error) {
    await log(`Error getMyLevel:\n${error}`, true);
    throw new Error('Gagal membuat kartu rank.');
  }
};
export async function getMyBalance(user, username, avatarUrl) {
  try {
    const balanceCardBuffer = await createBalanceCard({
      username: username,
      discriminator: user.levelName,
      avatarUrl: avatarUrl,
      balance: formatNumber(user.balance),
    });
    return balanceCardBuffer;
  } catch (error) {
    await log(`Error getMyBalance:\n${error}`, true);
    throw new Error('Gagal membuat kartu balance.');
  }
};
export async function getLeaderboardText(dbSettings) {
  const topUsers = await User.getLeaderboard('xp', 20);
  if (!topUsers || topUsers.length === 0) return "Belum ada seorang pun di leaderboard.";
  let ranks = `*✨ ${dbSettings.botname} LEADERBOARD ✨*\n\n`;
  ranks += `────────────────────────\n`;
  const mentions = [];
  topUsers.forEach((user, index) => {
    const id = user.userId.split('@')[0];
    mentions.push(user.userId);
    ranks += `*${index + 1}. @${id}*\n`;
    ranks += `   🌟 *XP:* ${user.xp.toLocaleString()}/${user.maxXp.toLocaleString()}\n`;
    ranks += `   ⚡ *Rank:* ${user.levelName}\n`;
    ranks += `   💰 *Balance:* ${formatNumber(user.balance)}\n`;
    ranks += `────────────────────────\n`;
  });
  const totalPlayers = await User.countDocuments();
  ranks += `*Total Pemain:* ${totalPlayers}`;
  return { text: ranks, mentions };
};