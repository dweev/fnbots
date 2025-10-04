// ─── Info ────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/sudoku.js ─────────────────────

import { createCanvas } from 'canvas';

export function parseSudokuCoord(input) {
  const match = input.toLowerCase().match(/^([a-i])([1-9])$/);
  if (!match) return null;
  const col = match[1].charCodeAt(0) - 'a'.charCodeAt(0);
  const row = parseInt(match[2], 10) - 1;
  return row * 9 + col;
};
export async function generateSudokuBoardImage(puzzle, board, errorIndices = []) {
  const squareSize = 45;
  const boardSize = squareSize * 9;
  const canvas = createCanvas(boardSize, boardSize);
  const ctx = canvas.getContext('2d');
  const colLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
  const rowLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const index = r * 9 + c;
      const x = c * squareSize;
      const y = r * squareSize;
      ctx.fillStyle = 'white';
      ctx.fillRect(x, y, squareSize, squareSize);
      ctx.strokeStyle = '#DDDDDD';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, squareSize, squareSize);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.font = 'bold 12px Arial';
      if (c === 0) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(rowLabels[r], x + 3, y + 3);
      }
      if (r === 8) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(colLabels[c], x + squareSize - 3, y + squareSize - 3);
      }
      const playerNum = board[index];
      if (playerNum !== null) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const isPuzzleNum = puzzle[index] !== null;
        let numberColor = '#0055CC';
        if (isPuzzleNum) {
          numberColor = 'black';
        } else if (errorIndices.includes(index)) {
          numberColor = '#D32F2F';
        }
        ctx.fillStyle = numberColor;
        ctx.font = isPuzzleNum ? 'bold 28px Arial' : '26px Arial';
        ctx.fillText(playerNum + 1, x + squareSize / 2, y + squareSize / 2);
      }
    }
  }
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2.5;
  for (let i = 0; i <= 9; i++) {
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.moveTo(i * squareSize, 0);
      ctx.lineTo(i * squareSize, boardSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * squareSize);
      ctx.lineTo(boardSize, i * squareSize);
      ctx.stroke();
    }
  }
  return canvas.toBuffer('image/png');
};