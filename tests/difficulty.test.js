const { chooseAIMove } = require('../server/services/aiDifficultyService');
const { evaluateBoard, getAvailableMoves } = require('../server/services/minimaxService');

function randomSequence(values) {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0);
}

function playerCannotForceWin(board, playerSymbol, aiSymbol, currentTurn) {
  const result = evaluateBoard(board);

  if (result.winner === playerSymbol) return false;
  if (result.winner === aiSymbol || result.isDraw) return true;

  if (currentTurn === playerSymbol) {
    return getAvailableMoves(board).every((move) => {
      board[move] = playerSymbol;
      const safe = playerCannotForceWin(board, playerSymbol, aiSymbol, aiSymbol);
      board[move] = null;
      return safe;
    });
  }

  const aiMove = chooseAIMove({
    board,
    aiSymbol,
    playerSymbol,
    difficulty: 'impossible',
    random: () => 0,
  }).move;

  board[aiMove] = aiSymbol;
  const safe = playerCannotForceWin(board, playerSymbol, aiSymbol, playerSymbol);
  board[aiMove] = null;
  return safe;
}

describe('aiDifficultyService', () => {
  test('easy AI uses a random move and no strategy', () => {
    const board = [
      'O', 'O', null,
      'X', null, null,
      null, null, null,
    ];

    const result = chooseAIMove({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'easy',
      random: randomSequence([0.99]),
    });

    expect(result).toEqual({ move: 8, strategy: 'random' });
  });

  test('normal AI uses random moves about 70 percent of the time', () => {
    const board = [
      'X', 'X', null,
      'O', null, null,
      null, null, null,
    ];

    const result = chooseAIMove({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'normal',
      random: randomSequence([0.2, 0.99]),
    });

    expect(result).toEqual({ move: 8, strategy: 'random' });
  });

  test('normal AI blocks when its logic branch is selected', () => {
    const board = [
      'X', 'X', null,
      'O', null, null,
      null, null, null,
    ];

    const result = chooseAIMove({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'normal',
      random: randomSequence([0.95]),
    });

    expect(result).toEqual({ move: 2, strategy: 'block' });
  });

  test('hard AI uses minimax on its main branch', () => {
    const board = [
      'O', 'O', null,
      'X', 'X', null,
      null, null, null,
    ];

    const result = chooseAIMove({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'hard',
      random: randomSequence([0.1]),
    });

    expect(result).toEqual({ move: 2, strategy: 'minimax' });
  });

  test('hard AI keeps a random variation branch', () => {
    const board = [
      'O', 'O', null,
      'X', null, null,
      null, null, null,
    ];

    const result = chooseAIMove({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'hard',
      random: randomSequence([0.95, 0.99]),
    });

    expect(result).toEqual({ move: 8, strategy: 'random' });
  });

  test('impossible AI cannot be forced to lose by any player line', () => {
    const board = Array(9).fill(null);

    expect(playerCannotForceWin(board, 'X', 'O', 'X')).toBe(true);
  });

  test('maestro difficulty uses minimax when no special ability condition exists', () => {
    const board = [
      'X', null, null,
      null, null, null,
      null, null, null,
    ];

    const result = chooseAIMove({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'maestro',
      random: () => 0.99,
    });

    expect(result).toEqual({
      move: expect.any(Number),
      strategy: 'minimax',
    });
  });
});
