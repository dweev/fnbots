// ─── Info ────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── info src/function/minesweeper.js ────────────────

export function generateMinesweeperBoard(width, height, numMines) {
  const board = Array(height)
    .fill(null)
    .map(() => Array(width).fill('0'));
  let minesPlaced = 0;
  while (minesPlaced < numMines) {
    const row = Math.floor(Math.random() * height);
    const col = Math.floor(Math.random() * width);
    if (board[row][col] !== '*') {
      board[row][col] = '*';
      minesPlaced++;
    }
  }
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (board[row][col] === '*') continue;
      let adjacentMines = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          const newRow = row + i;
          const newCol = col + j;
          if (newRow >= 0 && newRow < height && newCol >= 0 && newCol < width && board[newRow][newCol] === '*') {
            adjacentMines++;
          }
        }
      }
      board[row][col] = adjacentMines.toString();
    }
  }
  return board;
}
export function formatMinesweeperBoard(playerBoard, gameOver = false, solutionBoard = null) {
  const numberEmojis = ['🌀', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
  let boardText = '```\n';
  boardText += '   ' + Array.from({ length: playerBoard[0].length }, (_, i) => String.fromCharCode(65 + i)).join(' ');
  boardText += '\n';
  playerBoard.forEach((row, rowIndex) => {
    boardText += (rowIndex + 1).toString().padStart(2, ' ') + ' ';
    row.forEach((cell, colIndex) => {
      if (gameOver && solutionBoard[rowIndex][colIndex] === '*') {
        boardText += '💣 ';
      } else if (cell.status === 'terbuka') {
        boardText += numberEmojis[parseInt(cell.value)] + ' ';
      } else if (cell.status === 'ditandai') {
        boardText += '🚩 ';
      } else {
        boardText += '⬜️ ';
      }
    });
    boardText += '\n';
  });
  boardText += '```';
  return boardText;
}
export function revealCell(row, col, gameState) {
  const { solutionBoard, playerBoard } = gameState;
  const height = solutionBoard.length;
  const width = solutionBoard[0].length;
  if (row < 0 || row >= height || col < 0 || col >= width || playerBoard[row][col].status === 'terbuka') {
    return;
  }
  const cellValue = solutionBoard[row][col];
  playerBoard[row][col] = { status: 'terbuka', value: cellValue };
  if (cellValue === '0') {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        revealCell(row + i, col + j, gameState);
      }
    }
  }
}
export function checkWinCondition(gameState) {
  let hiddenCount = 0;
  for (const row of gameState.playerBoard) {
    for (const cell of row) {
      if (cell.status === 'tertutup' || cell.status === 'ditandai') {
        hiddenCount++;
      }
    }
  }
  return hiddenCount === gameState.mineCount;
}
