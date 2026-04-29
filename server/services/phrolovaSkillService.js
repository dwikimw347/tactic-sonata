const { WIN_PATTERNS, findBestMove, getAvailableMoves } = require('./minimaxService');

const DIFFICULTY_CHANCES = Object.freeze({
  easy: {
    cadence: 0.3,
    interruption: 0.2,
    prediction: 0,
  },
  normal: {
    cadence: 0.7,
    interruption: 0.5,
    prediction: 0.3,
  },
  hard: {
    cadence: 1,
    interruption: 1,
    prediction: 0.8,
  },
  impossible: {
    cadence: 1,
    interruption: 1,
    prediction: 1,
  },
  maestro: {
    cadence: 1,
    interruption: 1,
    prediction: 1,
  },
});

const PHROLOVA_SKILLS = Object.freeze({
  cadence: {
    skill: 'Perfect Cadence',
    dialogue: 'The final note... is mine.',
    effect: 'phrolova-win-threat',
    strategy: 'winning-move',
  },
  interruption: {
    skill: 'Crimson Interruption',
    dialogue: 'Your melody falters... allow me to silence it.',
    effect: 'phrolova-block',
    strategy: 'block',
  },
  prediction: {
    skill: 'Symphony Prediction',
    dialogue: 'Every move you make... I have already heard its echo.',
    effect: 'phrolova-prediction',
    strategy: 'minimax',
  },
  echo: {
    skill: 'Echo Manipulation',
    dialogue: 'Not every note follows logic... some are meant to deceive.',
    effect: 'phrolova-random',
    strategy: 'random',
  },
});

function normalizeDifficulty(difficulty) {
  return DIFFICULTY_CHANCES[difficulty] ? difficulty : 'normal';
}

function rollChance(chance, random) {
  if (chance >= 1) return true;
  if (chance <= 0) return false;
  return random() < chance;
}

function findLineGap(board, symbol) {
  for (const pattern of WIN_PATTERNS) {
    const cells = pattern.map((index) => board[index]);
    const symbolCount = cells.filter((cell) => cell === symbol).length;
    const emptyOffset = cells.findIndex((cell) => !cell);

    if (symbolCount === 2 && emptyOffset !== -1) {
      return pattern[emptyOffset];
    }
  }

  return null;
}

function findWinningMove(board, aiSymbol) {
  return findLineGap(board, aiSymbol);
}

function findBlockingMove(board, playerSymbol) {
  return findLineGap(board, playerSymbol);
}

function getRandomMove(board, random = Math.random) {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return null;

  const selectedIndex = Math.floor(random() * availableMoves.length);
  return availableMoves[Math.min(selectedIndex, availableMoves.length - 1)];
}

function createSkillResult(type, move) {
  return {
    ...PHROLOVA_SKILLS[type],
    move,
  };
}

function choosePhrolovaSkill({
  board,
  aiSymbol,
  playerSymbol,
  difficulty = 'normal',
  random = Math.random,
}) {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const chances = DIFFICULTY_CHANCES[normalizedDifficulty];
  const availableMoves = getAvailableMoves(board);

  if (availableMoves.length === 0) {
    return createSkillResult('echo', null);
  }

  const winningMove = findWinningMove(board, aiSymbol);
  if (winningMove !== null && rollChance(chances.cadence, random)) {
    return createSkillResult('cadence', winningMove);
  }

  const blockingMove = findBlockingMove(board, playerSymbol);
  if (blockingMove !== null && rollChance(chances.interruption, random)) {
    return createSkillResult('interruption', blockingMove);
  }

  if (rollChance(chances.prediction, random)) {
    const predictedMove = findBestMove(board, aiSymbol, playerSymbol);
    return createSkillResult('prediction', predictedMove !== null ? predictedMove : getRandomMove(board, random));
  }

  return createSkillResult('echo', getRandomMove(board, random));
}

function toPublicPhrolovaSkill(skillResult) {
  if (!skillResult) return null;

  return {
    name: skillResult.skill,
    dialogue: skillResult.dialogue,
    effect: skillResult.effect,
    move: skillResult.move,
  };
}

module.exports = {
  DIFFICULTY_CHANCES,
  choosePhrolovaSkill,
  findBlockingMove,
  findWinningMove,
  getRandomMove,
  toPublicPhrolovaSkill,
};
