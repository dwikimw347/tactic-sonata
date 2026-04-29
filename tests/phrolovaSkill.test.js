const { findBestMove } = require('../server/services/minimaxService');
const {
  choosePhrolovaSkill,
  findBlockingMove,
  findWinningMove,
  getRandomMove,
} = require('../server/services/phrolovaSkillService');

function randomSequence(values) {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : 0);
}

describe('phrolovaSkillService', () => {
  test('Perfect Cadence chooses a winning move on Hard', () => {
    const board = [
      'O', 'O', null,
      'X', 'X', null,
      null, null, null,
    ];

    const result = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'hard',
      random: () => 0.99,
    });

    expect(findWinningMove(board, 'O')).toBe(2);
    expect(result).toMatchObject({
      skill: 'Perfect Cadence',
      move: 2,
      effect: 'phrolova-win-threat',
    });
  });

  test('Perfect Cadence chooses a winning move on Impossible without random fallback', () => {
    const board = [
      'X', null, null,
      'O', 'O', null,
      'X', null, null,
    ];

    const result = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'impossible',
      random: () => 0.99,
    });

    expect(result.skill).toBe('Perfect Cadence');
    expect(result.move).toBe(5);
  });

  test('Crimson Interruption blocks the player on Hard', () => {
    const board = [
      'X', 'X', null,
      'O', null, null,
      null, null, null,
    ];

    const result = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'hard',
      random: () => 0.99,
    });

    expect(findBlockingMove(board, 'X')).toBe(2);
    expect(result).toMatchObject({
      skill: 'Crimson Interruption',
      move: 2,
      effect: 'phrolova-block',
    });
  });

  test('Crimson Interruption blocks the player on Impossible', () => {
    const board = [
      'X', null, null,
      'O', 'X', null,
      null, null, null,
    ];

    const result = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'impossible',
      random: () => 0.99,
    });

    expect(result.skill).toBe('Crimson Interruption');
    expect(result.move).toBe(8);
  });

  test('Symphony Prediction uses minimax on Impossible when no urgent move exists', () => {
    const board = [
      'X', null, null,
      null, 'O', null,
      null, null, null,
    ];
    const expectedMove = findBestMove(board, 'O', 'X');

    const result = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'impossible',
      random: () => 0.99,
    });

    expect(result).toMatchObject({
      skill: 'Symphony Prediction',
      move: expectedMove,
      effect: 'phrolova-prediction',
    });
  });

  test('Echo Manipulation chooses a random valid move on Easy', () => {
    const board = [
      'X', 'O', null,
      null, null, null,
      null, null, null,
    ];

    const result = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'easy',
      random: randomSequence([0.99]),
    });

    expect(result.skill).toBe('Echo Manipulation');
    expect(board[result.move]).toBeNull();
    expect(result.move).toBe(getRandomMove(board, () => 0.99));
  });

  test('Normal can block, predict, or fall back to Echo Manipulation', () => {
    const threatBoard = [
      'X', 'X', null,
      'O', null, null,
      null, null, null,
    ];
    const quietBoard = [
      'X', null, null,
      null, 'O', null,
      null, null, null,
    ];

    const normalBlock = choosePhrolovaSkill({
      board: threatBoard,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'normal',
      random: randomSequence([0.1]),
    });
    const normalPrediction = choosePhrolovaSkill({
      board: quietBoard,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'normal',
      random: randomSequence([0.1]),
    });
    const normalEcho = choosePhrolovaSkill({
      board: quietBoard,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'normal',
      random: randomSequence([0.9, 0.99]),
    });

    expect(normalBlock.skill).toBe('Crimson Interruption');
    expect(normalPrediction.skill).toBe('Symphony Prediction');
    expect(normalEcho.skill).toBe('Echo Manipulation');
  });

  test('Hard mostly plays optimal but can still use Echo Manipulation', () => {
    const board = [
      'X', null, null,
      null, 'O', null,
      null, null, null,
    ];

    const hardPrediction = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'hard',
      random: randomSequence([0.1]),
    });
    const hardEcho = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'hard',
      random: randomSequence([0.95, 0]),
    });

    expect(hardPrediction.skill).toBe('Symphony Prediction');
    expect(hardEcho.skill).toBe('Echo Manipulation');
  });

  test('Impossible always uses optimal skills and never Echo Manipulation', () => {
    const board = [
      'X', null, null,
      null, 'O', null,
      null, null, null,
    ];

    const result = choosePhrolovaSkill({
      board,
      aiSymbol: 'O',
      playerSymbol: 'X',
      difficulty: 'impossible',
      random: () => 0.99,
    });

    expect(result.skill).toBe('Symphony Prediction');
    expect(result.skill).not.toBe('Echo Manipulation');
  });
});
