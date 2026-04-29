const scoreStore = require('../server/data/scoreStore');
const {
  createSkillState,
  detectHarmonyThreat,
  findInsightMove,
  undoLastPlayerTurn,
} = require('../server/services/playerSkillService');

function makeGame(overrides = {}) {
  return {
    board: Array(9).fill(null),
    playerSymbol: 'X',
    aiSymbol: 'O',
    currentTurn: 'X',
    status: 'playing',
    winner: null,
    winningPattern: [],
    history: [],
    skills: createSkillState(),
    ...overrides,
  };
}

describe('playerSkillService - Insight Move', () => {
  test('suggests a winning move when the player can win', () => {
    const board = [
      'X', 'X', null,
      'O', 'O', null,
      null, null, null,
    ];

    expect(findInsightMove(board, 'X', 'O')).toBe(2);
  });

  test('suggests a blocking move when Phrolova is about to win', () => {
    const board = [
      'O', 'O', null,
      'X', null, null,
      null, null, 'X',
    ];

    expect(findInsightMove(board, 'X', 'O')).toBe(2);
  });

  test('never suggests an occupied cell', () => {
    const board = [
      'X', 'O', 'X',
      'O', 'X', null,
      null, null, 'O',
    ];
    const move = findInsightMove(board, 'X', 'O');

    expect(move).not.toBeNull();
    expect(board[move]).toBeNull();
  });
});

describe('playerSkillService - Undo Move', () => {
  beforeEach(() => {
    scoreStore.resetAll();
  });

  test('restores the board to the state before the player turn', () => {
    const game = makeGame({
      board: ['X', null, null, null, 'O', null, null, null, null],
      history: [
        { by: 'player', symbol: 'X', index: 0 },
        { by: 'ai', symbol: 'O', index: 4, strategy: 'minimax' },
      ],
    });

    const result = undoLastPlayerTurn(game);

    expect(result.ok).toBe(true);
    expect(result.data.game.board).toEqual(Array(9).fill(null));
    expect(result.data.game.currentTurn).toBe('X');
  });

  test('removes the undone player move and Phrolova response from history', () => {
    const game = makeGame({
      board: ['X', null, null, null, 'O', null, 'X', null, 'O'],
      history: [
        { by: 'player', symbol: 'X', index: 0 },
        { by: 'ai', symbol: 'O', index: 4, strategy: 'minimax' },
        { by: 'player', symbol: 'X', index: 6 },
        { by: 'ai', symbol: 'O', index: 8, strategy: 'minimax' },
      ],
    });

    const result = undoLastPlayerTurn(game);

    expect(result.ok).toBe(true);
    expect(result.data.game.history).toEqual([
      { by: 'player', symbol: 'X', index: 0 },
      { by: 'ai', symbol: 'O', index: 4, strategy: 'minimax' },
    ]);
    expect(result.data.removedMoves).toHaveLength(2);
  });

  test('does not change score while undoing', () => {
    scoreStore.incrementScore('player');
    const before = scoreStore.getScore();
    const game = makeGame({
      board: ['X', null, null, null, 'O', null, null, null, null],
      history: [
        { by: 'player', symbol: 'X', index: 0 },
        { by: 'ai', symbol: 'O', index: 4, strategy: 'minimax' },
      ],
    });

    undoLastPlayerTurn(game);

    expect(scoreStore.getScore()).toEqual(before);
  });
});

describe('playerSkillService - Harmony Shield', () => {
  test('detects Phrolova immediate winning threat', () => {
    const board = [
      'O', 'O', null,
      'X', null, null,
      null, null, 'X',
    ];

    expect(detectHarmonyThreat(board, 'X', 'O')).toMatchObject({
      isThreatDetected: true,
      blockMoveIndex: 2,
    });
  });

  test('returns inactive state when there is no immediate threat', () => {
    const board = [
      'O', null, null,
      'X', null, null,
      null, null, null,
    ];

    expect(detectHarmonyThreat(board, 'X', 'O')).toMatchObject({
      isThreatDetected: false,
      blockMoveIndex: null,
    });
  });
});
