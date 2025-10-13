// ─── Info ────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/ulartangga.js ─────────────────

import sharp from 'sharp';
import { delay } from 'baileys';
import log from '../lib/logger.js';
import config from '../../config.js';

export const turboBoard = {
  size: 50,
  ladders: {
    3: 21,
    8: 31,
    18: 44,
    28: 49
  },
  snakes: {
    47: 12,
    38: 20,
    26: 7,
    16: 4
  }
};
export function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
};
export function createRandomMap() {
  const basePath = config.paths.basePath;
  const mapsData = [
    { move: { 4: 56, 12: 50, 14: 55, 22: 58, 41: 79, 54: 88, 96: 42, 94: 71, 75: 32, 48: 16, 37: 3, 28: 10 } },
    { move: { 7: 36, 21: 58, 31: 51, 34: 84, 54: 89, 63: 82, 96: 72, 78: 59, 66: 12, 56: 20, 43: 24, 33: 5 } },
    { move: { 8: 29, 10: 32, 20: 39, 27: 85, 51: 67, 72: 91, 79: 100, 98: 65, 94: 75, 93: 73, 64: 60, 62: 19, 56: 24, 53: 50, 17: 7 } },
    { move: { 8: 29, 10: 32, 20: 39, 27: 85, 51: 67, 72: 91, 79: 100, 98: 65, 94: 75, 93: 73, 64: 60, 62: 19, 56: 24, 53: 50, 17: 7 } },
    { move: { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 72: 91, 80: 99, 98: 79, 94: 75, 93: 73, 87: 36, 64: 60, 62: 19, 54: 34, 17: 7 } },
    { move: { 4: 23, 13: 46, 33: 52, 42: 63, 50: 69, 62: 81, 74: 93, 99: 41, 95: 76, 89: 53, 66: 45, 54: 31, 43: 17, 40: 2, 27: 5 } },
    { move: { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 71: 91, 80: 100, 98: 79, 95: 75, 93: 73, 87: 24, 64: 60, 62: 19, 54: 34, 17: 7 } },
    { move: { 2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 78: 98, 87: 94, 99: 80, 95: 75, 92: 88, 89: 68, 74: 53, 64: 60, 62: 19, 49: 11, 46: 25, 16: 6 } }
  ];
  const randomIndex = Math.floor(Math.random() * mapsData.length);
  const selectedMap = mapsData[randomIndex];
  selectedMap.path = `${basePath}map${randomIndex + 1}.jpg`;
  selectedMap.size = 100;
  return selectedMap;
};
export function startUlarTanggaTimeout(idGroup, ularTanggaSessions) {
  const gameDuration = 3 * 60 * 1000;
  const timeoutCallback = () => {
    if (ularTanggaSessions[idGroup]) {
      delete ularTanggaSessions[idGroup];
    }
  };
  if (ularTanggaSessions[idGroup]) {
    ularTanggaSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
  }
};
export async function generateUlarTanggaImage(gameState) {
  try {
    const boardSize = 1024;
    const tileSize = boardSize / 10;
    const players = [
      { id: gameState.playerJid, position: gameState.playerPos },
      { id: 'BOT', position: gameState.botPos }
    ];
    const pionImagesPath = config.paths.pionImagesPath;
    const pionFiles = [`${pionImagesPath}player1.png`, `${pionImagesPath}player2.png`];
    const layers = [];
    for (let i = 0; i < players.length; i++) {
      const { position } = players[i];
      if (position === 0) continue;
      const row = Math.floor((position - 1) / 10);
      const col = (row % 2 === 0) ? (position - 1) % 10 : 9 - (position - 1) % 10;
      const x = col * tileSize;
      const y = (9 - row) * tileSize;
      const pionSize = Math.round(tileSize * 0.7);
      const pionBuffer = await sharp(pionFiles[i]).resize(pionSize, pionSize).toBuffer();
      const offsetX = (tileSize - pionSize) / 2;
      const offsetY = (tileSize - pionSize) / 2;
      layers.push({
        input: pionBuffer,
        top: Math.round(y + offsetY),
        left: Math.round(x + offsetX),
      });
    }
    const finalImageBuffer = await sharp(gameState.map.path).resize(boardSize, boardSize).composite(layers).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toBuffer();
    return finalImageBuffer;
  } catch (error) {
    await log(`Error generateUlarTanggaImage:\n${error}`, true);
    return null;
  }
};
export async function runBotUlarTanggaTurn(toId, m, fn, ularTanggaSessions) {
  const gameState = ularTanggaSessions[toId];
  if (!gameState) return;
  if (gameState.botDoublesCount === undefined) {
    gameState.botDoublesCount = 0;
  }
  await delay(1500);
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const totalMove = dice1 + dice2;
  const isDouble = dice1 === dice2;
  let botText = `🤖 Giliran Bot...\n`;
  botText += `Bot melempar dadu dan mendapat 🎲(${dice1}) + 🎲(${dice2}) = *${totalMove}*.\n`;
  const oldPos = gameState.botPos;
  gameState.botPos += totalMove;
  botText += `Bot maju dari kotak *${oldPos}* ke *${gameState.botPos}*.\n`;
  const board = gameState.board;
  if (board.ladders[gameState.botPos]) {
    const targetPos = board.ladders[gameState.botPos];
    botText += `Bot mendarat di tangga! 🪜 Bot naik ke kotak *${targetPos}*.\n`;
    gameState.botPos = targetPos;
  } else if (board.snakes[gameState.botPos]) {
    const targetPos = board.snakes[gameState.botPos];
    botText += `Bot mendarat di ular! 🐍 Bot turun ke kotak *${targetPos}*.\n`;
    gameState.botPos = targetPos;
  }
  if (gameState.botPos >= board.size) {
    botText += `\n🤖 Bot mencapai garis finis dan MENANG!`;
    await fn.sendPesan(toId, botText, { ephemeralExpiration: m.expiration ?? 0 });
    clearTimeout(gameState.timeoutId);
    delete ularTanggaSessions[toId];
    return;
  }
  if (isDouble && gameState.botDoublesCount < 2) {
    gameState.botDoublesCount++;
    botText += `\nBot mendapat angka kembar dan berhak melempar lagi! (Bonus ke-${gameState.botDoublesCount})`;
    await fn.sendPesan(toId, botText, { ephemeralExpiration: m.expiration ?? 0 });
    setTimeout(() => runBotUlarTanggaTurn(toId, m, fn, ularTanggaSessions), 2000);
  } else {
    if (isDouble && gameState.botDoublesCount >= 2) {
      botText += `\nBot sudah mendapat 3x giliran. Giliran bonus hangus.\n`;
    }
    gameState.botDoublesCount = 0;
    gameState.turn = 'player';
    botText += `\nSekarang giliranmu, @${gameState.playerJid.split('@')[0]}! Ketik *lempar*.`;
    await fn.sendPesan(toId, botText, { ephemeralExpiration: m.expiration ?? 0 });
    startUlarTanggaTimeout(toId, ularTanggaSessions);
  }
};
export async function runBotUlarTanggaTurnV2(toId, m, fn, ulartangga) {
  const sPesan = (text) => fn.sendPesan(toId, text, { ephemeralExpiration: m.expiration ?? 0 });
  const gameState = ulartangga[toId];
  if (!gameState) return;
  await delay(2000);
  const roll = rollDice();
  const oldPos = gameState.botPos;
  gameState.botPos += roll;
  if (gameState.botPos > 100) gameState.botPos = 100 - (gameState.botPos - 100);
  let moveText = `🤖 *Giliran Bot...*\n` +
    `Bot melempar dadu dan mendapat angka *${roll}*.\n` +
    `Bot maju dari *${oldPos}* ke *${gameState.botPos}*.\n`;
  const moveEffect = gameState.map.move[gameState.botPos];
  if (moveEffect) {
    moveText += gameState.botPos > moveEffect ? `Bot Termakan Ular! 🐍 Turun ke *${moveEffect}*.\n` : `Bot Naik Tangga! 🪜 Naik ke *${moveEffect}*.\n`;
    gameState.botPos = moveEffect;
  }
  const newBoard = await generateUlarTanggaImage(gameState);
  if (!newBoard) return await sPesan('Gagal membuat gambar papan.');
  if (gameState.botPos === 100) {
    moveText += `\nMaaf, Bot MENANG!`;
    await sPesan({ image: newBoard, caption: moveText, mentions: [gameState.playerJid] });
    clearTimeout(gameState.timeoutId);
    delete ulartangga[toId];
    return;
  }
  gameState.turn = 'player';
  moveText += `\nGiliranmu, @${gameState.playerJid.split('@')[0]}! Ketik *roll* atau *kocok*.`;
  await sPesan({ image: newBoard, caption: moveText, mentions: [gameState.playerJid] });
  const gameDuration = 3 * 60 * 1000;
  gameState.timeoutId = setTimeout(async () => {
    if (ulartangga[toId]) {
      await sPesan(`⏰ *Waktu Habis!* Sesi Ular Tangga dihentikan.`);
      delete ulartangga[toId];
    }
  }, gameDuration);
};