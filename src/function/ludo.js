// ─── Info ───────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/ludo.js ──────────────────────

import sharp from 'sharp';
import { delay } from 'baileys';
import log from '../lib/logger.js';
import config from '../../config.js';
import { rollDice } from './index.js';

export const PLAYERS = ['BLUE', 'YELLOW', 'GREEN', 'RED'];
export const BASE_POSITIONS = { BLUE: 500, YELLOW: 600, GREEN: 700, RED: 800 };
const START_POSITIONS = { BLUE: 0, YELLOW: 13, GREEN: 26, RED: 39 };
export const HOME_POSITIONS = { BLUE: 305, YELLOW: 205, GREEN: 105, RED: 405 };
const TURNING_POINTS = { BLUE: 49, YELLOW: 10, GREEN: 23, RED: 36 };
const HOME_ENTRANCE = { BLUE: 300, YELLOW: 200, GREEN: 100, RED: 400 };
const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
const COORDINATES_MAP = {
  0: [7.2, 15.5],
  1: [7.2, 14.3],
  2: [7.2, 13.2],
  3: [7.2, 12],
  4: [7.2, 10.8],
  5: [6.05, 9.6],
  6: [4.9, 9.6],
  7: [3.7, 9.6],
  8: [2.5, 9.6],
  9: [1.3, 9.6],
  10: [0.1, 9.6],
  11: [0.1, 8.4],
  12: [0.1, 7.25],
  13: [1.3, 7.25],
  14: [2.5, 7.25],
  15: [3.7, 7.25],
  16: [4.9, 7.25],
  17: [6.05, 7.25],
  18: [7.2, 6],
  19: [7.2, 4.9],
  20: [7.2, 3.7],
  21: [7.2, 2.5],
  22: [7.2, 1.3],
  23: [7.2, 0.1],
  24: [8.4, 0.1],
  25: [9.6, 0.1],
  26: [9.6, 1.3],
  27: [9.6, 2.5],
  28: [9.6, 3.7],
  29: [9.6, 4.9],
  30: [9.6, 6],
  31: [10.8, 7.25],
  32: [12, 7.25],
  33: [13.2, 7.25],
  34: [14.4, 7.25],
  35: [15.5, 7.25],
  36: [16.8, 7.25],
  37: [16.8, 8.4],
  38: [16.8, 9.6],
  39: [15.5, 9.6],
  40: [14.4, 9.6],
  41: [13.2, 9.6],
  42: [12, 9.6],
  43: [10.8, 9.6],
  44: [9.6, 10.8],
  45: [9.6, 12],
  46: [9.6, 13.2],
  47: [9.6, 14.3],
  48: [9.6, 15.5],
  49: [9.6, 16.8],
  50: [8.4, 16.8],
  51: [7.2, 16.8],
  100: [8.4, 0.1],
  101: [8.4, 1.3],
  102: [8.4, 2.5],
  103: [8.4, 3.7],
  104: [8.4, 4.9],
  105: [8.4, 6],
  200: [0.1, 8.4],
  201: [1.3, 8.4],
  202: [2.5, 8.4],
  203: [3.7, 8.4],
  204: [4.9, 8.4],
  205: [6, 8.4],
  300: [8.4, 16.8],
  301: [8.4, 15.5],
  302: [8.4, 14.4],
  303: [8.4, 13.2],
  304: [8.4, 12],
  305: [8.4, 10.8],
  400: [16.8, 8.4],
  401: [15.5, 8.4],
  402: [14.4, 8.4],
  403: [13.2, 8.4],
  404: [12, 8.4],
  405: [10.8, 8.4],
  500: [4.3, 14.9],
  600: [1.8, 4.2],
  700: [12.5, 2],
  800: [15, 12.5]
};

export function startLudoTimeout(idGroup, ludoSessions) {
  const gameDuration = 5 * 60 * 1000;
  const timeoutCallback = () => {
    if (ludoSessions[idGroup]) {
      delete ludoSessions[idGroup];
    }
  };
  if (ludoSessions[idGroup]) {
    if (ludoSessions[idGroup].timeoutId) {
      clearTimeout(ludoSessions[idGroup].timeoutId);
    }
    ludoSessions[idGroup].timeoutId = setTimeout(timeoutCallback, gameDuration);
  }
};
export function calculateNewPosition(currentPos, roll, color) {
  if (currentPos >= 500) {
    return (roll === 6) ? START_POSITIONS[color] : currentPos;
  }
  if (currentPos >= 100) {
    const finishTarget = HOME_POSITIONS[color];
    if (currentPos + roll <= finishTarget) {
      return currentPos + roll;
    }
    return currentPos;
  }
  const turningPoint = TURNING_POINTS[color];
  const homeEntrance = HOME_ENTRANCE[color];
  let newPos = currentPos;
  for (let i = 0; i < roll; i++) {
    if (newPos === turningPoint) {
      newPos = homeEntrance;
    } else if (newPos >= 100) {
      newPos++;
    } else {
      newPos++;
      if (newPos > 51) {
        newPos = 0;
      }
    }
  }
  return newPos;
};
export function checkForCapture(gameState, attackerColor, attackerNewPos) {
  let captureText = '';
  if (SAFE_POSITIONS.includes(attackerNewPos)) {
    return captureText;
  }
  for (const color of gameState.players) {
    if (color === attackerColor) continue;
    const opponentPawnPos = gameState.pawnPositions[color];
    if (opponentPawnPos === attackerNewPos) {
      gameState.pawnPositions[color] = BASE_POSITIONS[color];
      captureText += `⚔️ Pion *${attackerColor}* memakan pion *${color}*!\n`;
    }
  }
  return captureText;
};
export async function runBotLudoTurns(toId, m, fn, ludoSessions) {
  const sPesan = (text) => fn.sendPesan(toId, text, { ephemeralExpiration: m.expiration ?? 0 });
  const gameState = ludoSessions[toId];
  if (!gameState || gameState.status !== 'BOTS_TURN') return;
  const botColor = gameState.players[gameState.turn];
  if (botColor === 'RED') return;
  await delay(2500);
  const roll = rollDice();
  let moveText = `🤖 Giliran Bot *${botColor}*...\n` + `Bot melempar dadu dan mendapat angka *${roll}*.\n`;
  const currentPos = gameState.pawnPositions[botColor];
  if (currentPos >= 500 && roll !== 6) {
    moveText += `Bot perlu angka 6 untuk keluar. Giliran dilewatkan.\n`;
  } else {
    const newPos = calculateNewPosition(currentPos, roll, botColor);
    gameState.pawnPositions[botColor] = newPos;
    if (currentPos >= 500) {
      moveText += `Bot keluar dari kandang.\n`;
    } else {
      moveText += `Pion *${botColor}* maju *${roll}* langkah...\n`;
    }
    const captureText = checkForCapture(gameState, botColor, newPos);
    if (captureText) {
      moveText += captureText;
    }
  }
  if (gameState.pawnPositions[botColor] === HOME_POSITIONS[botColor]) {
    moveText += `\nMaaf, Bot *${botColor}* MENANG! Permainan berakhir.`;
    const finalBoard = await generateLudoBoard(gameState);
    if (finalBoard) await sPesan({ image: finalBoard, caption: moveText });
    clearTimeout(gameState.timeoutId);
    delete ludoSessions[toId];
    return;
  }
  if (roll === 6) {
    await sPesan({ text: moveText + `\nBot dapat angka 6 dan bermain lagi!` });
    setTimeout(() => runBotLudoTurns(toId, m, fn, ludoSessions), 2000);
  } else {
    gameState.turn = (gameState.turn + 1) % gameState.players.length;
    const nextPlayerColor = gameState.players[gameState.turn];
    if (nextPlayerColor !== 'RED') {
      await sPesan({ text: moveText });
      setTimeout(() => runBotLudoTurns(toId, m, fn, ludoSessions), 2000);
    } else {
      gameState.status = 'WAITING_FOR_ROLL';
      const finalBoard = await generateLudoBoard(gameState);
      if (finalBoard) {
        moveText += `\nGiliranmu, @${gameState.playerJid.split('@')[0]}! Ketik *roll*.`;
        await sPesan({ image: finalBoard, caption: moveText, mentions: [gameState.playerJid] });
        startLudoTimeout(toId, ludoSessions);
      }
    }
  }
};
export async function generateLudoBoard(gameState) {
  try {
    const ludoLocalAssets = config.paths;
    const squareSize = 30;
    const pionSize = 30;
    const pawnLayers = [];
    for (const color of gameState.players) {
      const pawnPath = ludoLocalAssets.pawns[color];
      const logicalPosition = gameState.pawnPositions[color];
      const gridCoords = COORDINATES_MAP[logicalPosition];
      if (gridCoords) {
        const resizedPawnBuffer = await sharp(pawnPath).resize(pionSize, pionSize).toBuffer();
        const [gridX, gridY] = gridCoords;
        const pixelX = gridX * squareSize;
        const pixelY = gridY * squareSize;
        const offsetX = Math.round((squareSize - pionSize) / 2);
        const offsetY = Math.round((squareSize - pionSize) / 2);
        pawnLayers.push({
          input: resizedPawnBuffer,
          top: Math.round(pixelY + offsetY),
          left: Math.round(pixelX + offsetX)
        });
      }
    }
    const finalBoardBuffer = await sharp(ludoLocalAssets.board).composite(pawnLayers).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toBuffer();
    return finalBoardBuffer;
  } catch (error) {
    await log(`Error generateLudoBoard:\n${error}`, true);
    return null;
  }
};