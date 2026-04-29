const { evaluateBoard, findBestMove } = require('../server/services/minimaxService');

function place(board, index, symbol) {
  const nextBoard = [...board];
  nextBoard[index] = symbol;
  return nextBoard;
}

describe('minimaxService', () => {
  test('minimax chooses a winning move', () => {
    const board = [
      'O', 'O', null,
      'X', 'X', null,
      null, null, null,
    ];

    expect(findBestMove(board, 'O', 'X')).toBe(2);
  });

  test('minimax blocks an immediate losing move', () => {
    const board = [
      'X', 'X', null,
      'O', null, null,
      null, null, null,
    ];

    expect(findBestMove(board, 'O', 'X')).toBe(2);
  });

  test('evaluateBoard detects win and draw states', () => {
    expect(evaluateBoard(['X', 'X', 'X', null, 'O', null, 'O', null, null])).toMatchObject({
      winner: 'X',
      winningPattern: [0, 1, 2],
      isDraw: false,
    });

    expect(evaluateBoard(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'])).toMatchObject({
      winner: null,
      winningPattern: [],
      isDraw: true,
    });
  });

  test('minimax supports AI playing as X', () => {
    const board = [
      'X', 'X', null,
      'O', 'O', null,
      null, null, null,
    ];

    expect(findBestMove(board, 'X', 'O')).toBe(2);
  });

  test('best move result can be applied to the board', () => {
    const board = [
      'O', 'O', null,
      'X', null, null,
      'X', null, null,
    ];
    const move = findBestMove(board, 'O', 'X');
    const nextBoard = place(board, move, 'O');

    expect(evaluateBoard(nextBoard).winner).toBe('O');
  });
});
