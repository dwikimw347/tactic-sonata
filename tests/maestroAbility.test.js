const {
  applyHecatesShadow,
  applyResonanceOverride,
  applySymphonyOfRebirth,
  canUseResonanceOverride,
  canUseSymphonyOfRebirth,
  ensureMaestroState,
  restoreHecatesShadow,
} = require('../server/services/maestroAbilityService');

function createGame(overrides = {}) {
  return ensureMaestroState({
    board: Array(9).fill(null),
    playerSymbol: 'X',
    aiSymbol: 'O',
    difficulty: 'maestro',
    status: 'playing',
    winner: null,
    winningPattern: [],
    currentTurn: 'O',
    history: [],
    boardHistory: [],
    match: {
      abilityUsage: {
        symphonyOfRebirthUsed: false,
      },
    },
    ...overrides,
  });
}

describe('maestroAbilityService', () => {
  test('Resonance Override can convert one player mark', () => {
    const game = createGame({
      board: ['O', 'O', 'X', null, null, null, null, null, null],
    });

    const ability = applyResonanceOverride(game);

    expect(ability.name).toBe('Resonance Override');
    expect(game.board[2]).toBe('O');
    expect(ability.affectedCells).toEqual([2]);
  });

  test('Resonance Override can be used repeatedly in Maestro mode', () => {
    const game = createGame({
      board: ['O', 'O', 'X', null, null, null, null, null, null],
    });

    applyResonanceOverride(game);
    game.board = ['O', null, null, 'O', null, null, 'X', null, null];

    expect(canUseResonanceOverride(game)).toBe(true);
  });

  test('Resonance Override prioritizes winning conversion', () => {
    const game = createGame({
      board: ['O', 'O', 'X', 'X', 'X', null, null, null, null],
    });

    const ability = applyResonanceOverride(game);

    expect(ability.reason).toBe('winning-conversion');
    expect(game.board[2]).toBe('O');
  });

  test('Hecate’s Shadow temporarily removes player threat', () => {
    const game = createGame({
      board: ['X', 'X', null, 'O', null, null, null, null, null],
    });

    const ability = applyHecatesShadow(game);

    expect(ability.name).toBe('Hecate’s Shadow');
    expect(ability.affectedCells).toContain(0);
    expect(game.board[0]).toBeNull();
  });

  test('Hecate’s Shadow restores mark after Phrolova move if not occupied', () => {
    const game = createGame({
      board: ['X', 'X', null, 'O', null, null, null, null, null],
    });

    applyHecatesShadow(game);
    game.board[4] = 'O';
    restoreHecatesShadow(game);

    expect(game.board[0]).toBe('X');
    expect(game.board[4]).toBe('O');
  });

  test('Symphony of Rebirth rolls board back 3 turns', () => {
    const game = createGame({
      boardHistory: [
        [null, null, null, null, null, null, null, null, null],
        ['X', null, null, null, null, null, null, null, null],
        ['X', null, null, null, 'O', null, null, null, null],
        ['X', 'X', null, null, 'O', null, null, null, null],
      ],
      board: ['X', 'X', 'X', null, 'O', null, null, null, null],
    });

    const ability = applySymphonyOfRebirth(game);

    expect(ability.name).toBe('Symphony of Rebirth');
    expect(game.board[0]).toBe('X');
    expect(game.board[1]).toBeNull();
  });

  test('Symphony of Rebirth adds Phrolova mark to center if empty', () => {
    const game = createGame({
      boardHistory: [
        [null, null, null, null, null, null, null, null, null],
        ['X', null, null, null, null, null, null, null, null],
        ['X', null, null, 'O', null, null, null, null, null],
      ],
      board: ['X', 'X', 'X', 'O', null, null, null, null, null],
    });

    applySymphonyOfRebirth(game);

    expect(game.board[4]).toBe('O');
  });

  test('Symphony of Rebirth can be used repeatedly in one match/session', () => {
    const game = createGame({
      boardHistory: [
        [null, null, null, null, null, null, null, null, null],
        ['X', null, null, null, null, null, null, null, null],
        ['X', null, null, null, 'O', null, null, null, null],
      ],
      board: ['X', 'X', 'X', null, 'O', null, null, null, null],
    });

    applySymphonyOfRebirth(game);
    game.board = ['X', 'X', 'X', null, 'O', null, null, null, null];

    expect(canUseSymphonyOfRebirth(game)).toBe(true);
  });
});
