// ─── Info ───────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/index.js ─────────────────

import {
  colorNameMap, getContrastColor, generateFakeChatWithQCGenerator, processAllTextFormatting
} from './fakeFunction.js';
import {
  SESSION_TIMEOUT, getSession, safetySettings
} from './chatbot.js';
import { 
  generateBoardImage 
} from './chess.js';
import { 
  makeCircleSticker, parseImageSelection, cleanYoutubeUrl, chunkArray, fetchTikTokData, buildBaseCaption, sendImages, webpFormatter, cleanFormattingText, formatTimestampToHourMinute, fetchJson, jadwalSholat
} from './function2.js';
import { 
  PLAYER_BLACK, PLAYER_WHITE,fileLabels, rankLabels, parseOthelloMove, makeOthelloMove, getValidOthelloMoves, calculateOthelloScore, generateOthelloBoardImage, createOthelloBoard
} from './othello.js';
import {
  runBotLudoTurns, calculateNewPosition, HOME_POSITIONS, checkForCapture, generateLudoBoard, startLudoTimeout, PLAYERS, BASE_POSITIONS
} from './ludo.js';
import {
  rollDice, generateUlarTanggaImage, runBotUlarTanggaTurnV2, runBotUlarTanggaTurn, turboBoard, createRandomMap, startUlarTanggaTimeout
} from './ulartangga.js';
import {
  emoji_role, endGame, initializeGameWW
} from './werewolf.js';
import {
  formatMinesweeperBoard, revealCell, checkWinCondition, generateMinesweeperBoard
} from './minesweeper.js';
import {
  checkWinner, formatTicTacToeBoard
} from './tictactoe.js';
import {
  generateSudokuBoardImage, parseSudokuCoord
} from './sudoku.js';
import {
  getMyLevel, getMyBalance, getLeaderboardText
} from './rank.js';
import {
  deepfry, glitch, mataikan, mirror, approved, rejected, thuglife, tobecontinue, subtitle, burn, blur, ghost, wrapText
} from './imageManipulation.js';
import { 
  formatHandSimple, getHandDetails, anteBonusMultipliers, createDeck, shuffleDeck, formatKartu, calculateScore, runBotTurn41, calculateSamgongValue, runBotSamgongTurn
} from './casino.js';
import {
  parseNIK, speedtest, getCommonGroups, getServerIp, formatNumber, saveFile, getTxt, getSerial, expiredVIPcheck, expiredCheck, sendAndCleanupFile, convertAudio, writeExif, getBuffer, mycmd, reviver, replacer, msgs, randomByte, arrayRemove, ulang, list, firstUpperCase, formatTimeAgo, formatCommandList, formatDurationMessage, formatDuration, waktu, color, bytesToSize, parseSelector, archimed, randomChoice, getSizeMedia, safeStringify, checkDepth, processContactUpdate, updateContact, isUserVerified, checkCommandAccess, textMatch2, textMatch1, initializeFuse, videoToWebp, gifToWebp, imageToWebp, parseCheatAmount
} from './function.js';
import {
  modes, genMath
} from './math.js';

export { 
  parseNIK, speedtest, getCommonGroups, getServerIp, formatNumber, saveFile, getTxt, getSerial, expiredVIPcheck, expiredCheck, sendAndCleanupFile, convertAudio, writeExif, getBuffer, mycmd, reviver, replacer, msgs, randomByte, arrayRemove, ulang, list, firstUpperCase, formatTimeAgo, formatCommandList, formatDurationMessage, formatDuration, waktu, color, bytesToSize, parseSelector, archimed, randomChoice, getSizeMedia, safeStringify, checkDepth, processContactUpdate, updateContact, isUserVerified, checkCommandAccess, textMatch2, textMatch1, initializeFuse, videoToWebp, gifToWebp, imageToWebp, deepfry, glitch, mataikan, mirror, approved, rejected, thuglife, tobecontinue, subtitle, burn, blur, ghost, getMyLevel, getMyBalance, getLeaderboardText, makeCircleSticker, parseCheatAmount, wrapText, parseImageSelection, cleanYoutubeUrl, chunkArray, fetchTikTokData, buildBaseCaption, sendImages, generateBoardImage, formatHandSimple, getHandDetails, anteBonusMultipliers, createDeck, shuffleDeck, formatKartu, calculateScore, rollDice, generateUlarTanggaImage, runBotUlarTanggaTurnV2, runBotUlarTanggaTurn, PLAYER_BLACK, PLAYER_WHITE,fileLabels, rankLabels, parseOthelloMove, makeOthelloMove, getValidOthelloMoves, calculateOthelloScore, generateOthelloBoardImage, runBotLudoTurns, calculateNewPosition, HOME_POSITIONS, checkForCapture, generateLudoBoard, startLudoTimeout, runBotTurn41, calculateSamgongValue, runBotSamgongTurn, emoji_role, checkWinner, formatTicTacToeBoard, formatMinesweeperBoard, revealCell, checkWinCondition, generateSudokuBoardImage, parseSudokuCoord, SESSION_TIMEOUT, getSession, safetySettings, turboBoard, createRandomMap, createOthelloBoard, generateMinesweeperBoard, PLAYERS, BASE_POSITIONS, modes, genMath, endGame, initializeGameWW, startUlarTanggaTimeout, colorNameMap, getContrastColor, webpFormatter, cleanFormattingText, formatTimestampToHourMinute, generateFakeChatWithQCGenerator, processAllTextFormatting, fetchJson, jadwalSholat
};