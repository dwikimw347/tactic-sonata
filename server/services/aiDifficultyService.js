const { WIN_PATTERNS, findBestMove, getAvailableMoves } = require('./minimaxService');

function findRandomMove(board, random = Math.random) {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return null;

  const selectedIndex = Math.floor(random() * availableMoves.length);
  return availableMoves[Math.min(selectedIndex, availableMoves.length - 1)];
}

function findBlockingMove(board, playerSymbol) {
  for (const pattern of WIN_PATTERNS) {
    const cells = pattern.map((index) => board[index]);
    const playerCount = cells.filter((cell) => cell === playerSymbol).length;
    const emptyOffset = cells.findIndex((cell) => !cell);

    if (playerCount === 2 && emptyOffset !== -1) {
      return pattern[emptyOffset];
    }
  }

  return null;
}

function chooseAIMove({ board, aiSymbol, playerSymbol, difficulty = 'normal', random = Math.random }) {
  const normalizedDifficulty = ['easy', 'normal', 'hard', 'impossible', 'maestro'].includes(difficulty)
    ? difficulty
    : 'normal';

  if (normalizedDifficulty === 'easy') {
    return {
      move: findRandomMove(board, random),
      strategy: 'random',
    };
  }

  if (normalizedDifficulty === 'normal') {
    const shouldPlayRandom = random() < 0.7;
    if (shouldPlayRandom) {
      return {
        move: findRandomMove(board, random),
        strategy: 'random',
      };
    }

    const blockingMove = findBlockingMove(board, playerSymbol);
    return {
      move: blockingMove !== null ? blockingMove : findRandomMove(board, random),
      strategy: blockingMove !== null ? 'block' : 'random',
    };
  }

  if (normalizedDifficulty === 'hard') {
    const shouldUseMinimax = random() < 0.8;
    return {
      move: shouldUseMinimax
        ? findBestMove(board, aiSymbol, playerSymbol)
        : findRandomMove(board, random),
      strategy: shouldUseMinimax ? 'minimax' : 'random',
    };
  }

  return {
    move: findBestMove(board, aiSymbol, playerSymbol),
    strategy: 'minimax',
  };
}

module.exports = {
  chooseAIMove,
  findBlockingMove,
  findRandomMove,
};
