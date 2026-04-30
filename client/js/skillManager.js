(() => {
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
    return Array.isArray(board) && board.length === 9
      ? board.map((cell) => (cell === "X" || cell === "O" ? cell : null))
      : Array(9).fill(null);
  }

  function evaluateBoard(board) {
    const safeBoard = normalizeBoard(board);
    for (const pattern of WIN_PATTERNS) {
      const [a, b, c] = pattern;
      if (safeBoard[a] && safeBoard[a] === safeBoard[b] && safeBoard[a] === safeBoard[c]) {
        return { winner: safeBoard[a], winningPattern: pattern, isDraw: false };
      }
    }

    return {
      winner: null,
      winningPattern: [],
      isDraw: safeBoard.every(Boolean),
    };
  }

  function getAvailableMoves(board) {
    return normalizeBoard(board)
      .map((cell, index) => (cell ? null : index))
      .filter((index) => index !== null);
  }

  function findLineGap(board, symbol) {
    const safeBoard = normalizeBoard(board);
    for (const pattern of WIN_PATTERNS) {
      const cells = pattern.map((index) => safeBoard[index]);
      const symbolCount = cells.filter((cell) => cell === symbol).length;
      const emptyOffset = cells.findIndex((cell) => !cell);
      if (symbolCount === 2 && emptyOffset !== -1) return pattern[emptyOffset];
    }
    return null;
  }

  function scoreTerminalState(board, aiSymbol, playerSymbol, depth) {
    const result = evaluateBoard(board);
    if (result.winner === aiSymbol) return 10 - depth;
    if (result.winner === playerSymbol) return depth - 10;
    if (result.isDraw) return 0;
    return null;
  }

  function minimax(board, aiSymbol, playerSymbol, isMaximizing, depth = 0) {
    const terminalScore = scoreTerminalState(board, aiSymbol, playerSymbol, depth);
    if (terminalScore !== null) return terminalScore;

    const moves = getAvailableMoves(board);
    if (isMaximizing) {
      let bestScore = -Infinity;
      moves.forEach((move) => {
        board[move] = aiSymbol;
        bestScore = Math.max(bestScore, minimax(board, aiSymbol, playerSymbol, false, depth + 1));
        board[move] = null;
      });
      return bestScore;
    }

    let bestScore = Infinity;
    moves.forEach((move) => {
      board[move] = playerSymbol;
      bestScore = Math.min(bestScore, minimax(board, aiSymbol, playerSymbol, true, depth + 1));
      board[move] = null;
    });
    return bestScore;
  }

  function findBestMove(board, symbol) {
    const safeBoard = normalizeBoard(board);
    const opponent = symbol === "X" ? "O" : "X";
    const availableMoves = getAvailableMoves(safeBoard);
    if (!availableMoves.length) return null;

    const winningMove = findLineGap(safeBoard, symbol);
    if (winningMove !== null) return winningMove;

    const blockingMove = findLineGap(safeBoard, opponent);
    if (blockingMove !== null) return blockingMove;

    let bestMove = availableMoves[0];
    let bestScore = -Infinity;

    availableMoves.forEach((move) => {
      safeBoard[move] = symbol;
      const score = minimax(safeBoard, symbol, opponent, false);
      safeBoard[move] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    });

    return bestMove;
  }

  function createDefaultSkillState() {
    return {
      player_x: { insight: 2, undo: 1, shield: "ready" },
      player_o: { insight: 2, undo: 1, shield: "ready" },
    };
  }

  function playerKey(symbol) {
    return symbol === "O" ? "player_o" : "player_x";
  }

  function normalizeSkillState(skillState) {
    const base = createDefaultSkillState();
    const next = {
      player_x: { ...base.player_x, ...(skillState?.player_x || {}) },
      player_o: { ...base.player_o, ...(skillState?.player_o || {}) },
    };

    next.player_x.insight = Math.max(0, Math.min(Number(next.player_x.insight) || 0, 2));
    next.player_o.insight = Math.max(0, Math.min(Number(next.player_o.insight) || 0, 2));
    next.player_x.undo = Math.max(0, Math.min(Number(next.player_x.undo) || 0, 1));
    next.player_o.undo = Math.max(0, Math.min(Number(next.player_o.undo) || 0, 1));
    next.player_x.shield = next.player_x.shield === "spent" ? "spent" : "ready";
    next.player_o.shield = next.player_o.shield === "spent" ? "spent" : "ready";
    return next;
  }

  window.TacTicSkills = {
    WIN_PATTERNS,
    createDefaultSkillState,
    evaluateBoard,
    findBestMove,
    findLineGap,
    getAvailableMoves,
    normalizeBoard,
    normalizeSkillState,
    playerKey,
  };
})();
