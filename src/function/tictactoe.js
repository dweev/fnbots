// ─── Info ────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/tictactoe.js ──────────────────

export function formatTicTacToeBoard(board) {
  let boardText = '```\n';
  for (let i = 0; i < 3; i++) {
    boardText += ` ${board[i][0] || (i * 3 + 1)} | ${board[i][1] || (i * 3 + 2)} | ${board[i][2] || (i * 3 + 3)} \n`;
    if (i < 2) {
      boardText += '-----------\n';
    }
  }
  boardText += '```';
  return boardText;
};
export function checkWinner(board) {
  const lines = [
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]],
  ];
  for (const line of lines) {
    if (line[0] && line[0] === line[1] && line[1] === line[2]) {
      return line[0];
    }
  }
  if (board.flat().every(cell => cell)) {
    return 'draw';
  }
  return null;
};