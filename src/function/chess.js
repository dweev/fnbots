// ─── Info ────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/chess.js ──────────────────────

import { createCanvas } from 'canvas';

export async function generateBoardImage(fen, perspective = 'w') {
  const squareSize = 50;
  const boardSize = squareSize * 8;
  const canvasSize = boardSize;
  const canvas = createCanvas(canvasSize, canvasSize);
  const ctx = canvas.getContext('2d');
  const pieces = {
    'p': '♙', 'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔',
    'P': '♟︎', 'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚'
  };
  const fileLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const rankLabels = ['8', '7', '6', '5', '4', '3', '2', '1'];
  if (perspective === 'b') {
    fileLabels.reverse();
    rankLabels.reverse();
  };
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const isLightSquare = (row + col) % 2 === 0;
      ctx.fillStyle = isLightSquare ? '#F0D9B5' : '#B58863';
      ctx.fillRect(col * squareSize, row * squareSize, squareSize, squareSize);
      ctx.fillStyle = isLightSquare ? 'rgba(181, 136, 99, 0.8)' : 'rgba(240, 217, 181, 0.8)';
      ctx.font = 'bold 12px Arial';
      if (col === 0) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(rankLabels[row], col * squareSize + 2, row * squareSize + 2);
      }
      if (row === 7) {
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(fileLabels[col], (col + 1) * squareSize - 2, (row + 1) * squareSize - 2);
      }
    }
  }
  const [board] = fen.split(' ');
  const ranks = board.split('/');
  if (perspective === 'b') {
    ranks.reverse().forEach((rank, i) => ranks[i] = rank.split('').reverse().join(''));
  }
  ranks.forEach((rankStr, rank) => {
    let file = 0;
    for (const char of rankStr) {
      if (/\d/.test(char)) {
        file += parseInt(char, 10);
      } else {
        ctx.fillStyle = (char === char.toUpperCase()) ? '#FFFFFF' : '#000000';
        ctx.strokeStyle = (char === char.toUpperCase()) ? '#000000' : '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.font = '42px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const pieceChar = pieces[char.toUpperCase()];
        const x = file * squareSize + squareSize / 2;
        const y = rank * squareSize + squareSize / 2;
        ctx.strokeText(pieceChar, x, y);
        ctx.fillText(pieceChar, x, y);
        file++;
      }
    }
  });
  return canvas.toBuffer('image/png');
};