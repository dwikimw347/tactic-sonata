const WIN_PATTERNS = Object.freeze([
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]);

function normalizeBoard(board) {
  if (!Array.isArray(board) || board.length !== 9) {
    throw new Error('Board must be an array with exactly 9 cells.');
  }

  return board.map((cell) => (cell === 'X' || cell === 'O' ? cell : null));
}

function getAvailableMoves(board) {
  return normalizeBoard(board)
    .map((cell, index) => (cell ? null : index))
    .filter((index) => index !== null);
}

function evaluateBoard(board) {
  const safeBoard = normalizeBoard(board);

  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    if (safeBoard[a] && safeBoard[a] === safeBoard[b] && safeBoard[a] === safeBoard[c]) {
      return {
        winner: safeBoard[a],
        winningPattern: pattern,
        isDraw: false,
      };
    }
  }

  const isDraw = safeBoard.every(Boolean);

  return {
    winner: null,
    winningPattern: [],
    isDraw,
  };
}

function scoreTerminalState(board, aiSymbol, playerSymbol, depth) {
  const result = evaluateBoard(board);

  if (result.winner === aiSymbol) {
    return 10 - depth;
  }

  if (result.winner === playerSymbol) {
    return depth - 10;
  }

  if (result.isDraw) {
    return 0;
  }

  return null;
}

function minimax(board, aiSymbol, playerSymbol, isMaximizing, depth = 0) {
  const terminalScore = scoreTerminalState(board, aiSymbol, playerSymbol, depth);
  if (terminalScore !== null) {
    return terminalScore;
  }

  const availableMoves = getAvailableMoves(board);

  if (isMaximizing) {
    let bestScore = -Infinity;

    for (const move of availableMoves) {
      board[move] = aiSymbol;
      const score = minimax(board, aiSymbol, playerSymbol, false, depth + 1);
      board[move] = null;
      bestScore = Math.max(bestScore, score);
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const move of availableMoves) {
    board[move] = playerSymbol;
    const score = minimax(board, aiSymbol, playerSymbol, true, depth + 1);
    board[move] = null;
    bestScore = Math.min(bestScore, score);
  }

  return bestScore;
}

function findBestMove(board, aiSymbol, playerSymbol) {
  const safeBoard = normalizeBoard(board);
  const availableMoves = getAvailableMoves(safeBoard);

  if (availableMoves.length === 0) {
    return null;
  }

  let bestMove = availableMoves[0];
  let bestScore = -Infinity;

  // Try every legal AI move, then let minimax simulate the player's best answer.
  for (const move of availableMoves) {
    safeBoard[move] = aiSymbol;
    const score = minimax(safeBoard, aiSymbol, playerSymbol, false, 0);
    safeBoard[move] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

module.exports = {
  WIN_PATTERNS,
  evaluateBoard,
  findBestMove,
  getAvailableMoves,
  minimax,
};
