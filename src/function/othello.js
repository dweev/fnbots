// ─── Info ────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/othello.js ────────────────────

import { createCanvas } from 'canvas';

export const PLAYER_BLACK = 1;
export const PLAYER_WHITE = 2;
export const fileLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
export const rankLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];

export function createOthelloBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(0));
  board[3][4] = PLAYER_BLACK;
  board[4][3] = PLAYER_BLACK;
  board[3][3] = PLAYER_WHITE;
  board[4][4] = PLAYER_WHITE;
  return board;
};
function getOthelloFlips(board, player, r, c) {
  if (board[r]?.[c] !== 0) return [];
  const opponent = player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const allFlips = [];
  for (const [dr, dc] of directions) {
    const flipsInDir = [];
    let curr_r = r + dr;
    let curr_c = c + dc;
    while (curr_r >= 0 && curr_r < 8 && curr_c >= 0 && curr_c < 8) {
      if (board[curr_r][curr_c] === opponent) {
        flipsInDir.push([curr_r, curr_c]);
      } else if (board[curr_r][curr_c] === player) {
        allFlips.push(...flipsInDir);
        break;
      } else {
        break;
      }
      curr_r += dr;
      curr_c += dc;
    }
  }
  return allFlips;
};
export function getValidOthelloMoves(board, player) {
  const validMoves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const flips = getOthelloFlips(board, player, r, c);
      if (flips.length > 0) {
        validMoves.push({ move: [r, c], flips: flips.length });
      }
    }
  }
  return validMoves;
};
export function makeOthelloMove(board, player, move) {
  const [r, c] = move;
  const flips = getOthelloFlips(board, player, r, c);
  if (flips.length === 0) return null;
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = player;
  for (const [fr, fc] of flips) {
    newBoard[fr][fc] = player;
  }
  return newBoard;
};
export function calculateOthelloScore(board) {
  let black = 0, white = 0;
  board.forEach(row => row.forEach(cell => {
    if (cell === PLAYER_BLACK) black++;
    if (cell === PLAYER_WHITE) white++;
  }));
  return { black, white };
};
export function parseOthelloMove(input) {
  const match = input.toLowerCase().match(/^([a-h])([1-8])$/);
  if (!match) return null;
  const col = match[1].charCodeAt(0) - 'a'.charCodeAt(0);
  const row = parseInt(match[2], 10) - 1;
  return [row, col];
};
export async function generateOthelloBoardImage(board, validMoves = []) {
  const squareSize = 50;
  const boardSize = squareSize * 8;
  const canvas = createCanvas(boardSize, boardSize);
  const ctx = canvas.getContext('2d');
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      ctx.fillStyle = '#008037';
      ctx.fillRect(c * squareSize, r * squareSize, squareSize, squareSize);
      ctx.strokeStyle = '#004C28';
      ctx.strokeRect(c * squareSize, r * squareSize, squareSize, squareSize);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 12px Arial';
      if (c === 0) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(rankLabels[r], c * squareSize + 3, r * squareSize + 3);
      }
      if (r === 7) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(fileLabels[c], (c + 1) * squareSize - 3, (r + 1) * squareSize - 3);
      }
    }
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (const { move } of validMoves) {
    const [r, c] = move;
    const x = c * squareSize + squareSize / 2;
    const y = r * squareSize + squareSize / 2;
    ctx.beginPath();
    ctx.arc(x, y, squareSize * 0.15, 0, 2 * Math.PI);
    ctx.fill();
  }
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const player = board[r][c];
      if (player === 0) continue;
      const x = c * squareSize + squareSize / 2;
      const y = r * squareSize + squareSize / 2;
      ctx.fillStyle = (player === PLAYER_BLACK) ? 'black' : 'white';
      ctx.strokeStyle = (player === PLAYER_BLACK) ? '#555' : '#CCC';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, squareSize * 0.4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
  }
  return canvas.toBuffer('image/png');
};