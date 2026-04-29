const EMPTY_BOARD = Object.freeze(Array(9).fill(null));
const VALID_DIFFICULTIES = Object.freeze(['easy', 'normal', 'hard', 'impossible', 'maestro']);

function createScore() {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
  };
}

function createMatch(matchMode = 3) {
  const totalRounds = Number(matchMode) === 5 ? 5 : 3;

  return {
    mode: totalRounds,
    targetWins: Math.ceil(totalRounds / 2),
    completedRounds: 0,
    playerWins: 0,
    aiWins: 0,
    draws: 0,
    isComplete: false,
    result: null,
    abilityUsage: {
      symphonyOfRebirthUsed: false,
    },
  };
}

const state = {
  score: createScore(),
  matchMode: 3,
  difficulty: 'normal',
  currentGame: null,
  match: createMatch(3),
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getInitialBoard() {
  return [...EMPTY_BOARD];
}

function getScore() {
  return clone(state.score);
}

function incrementScore(result) {
  if (result === 'player') state.score.wins += 1;
  if (result === 'ai') state.score.losses += 1;
  if (result === 'draw') state.score.draws += 1;
}

function resetScore() {
  state.score = createScore();
}

function getMatchMode() {
  return state.matchMode;
}

function setMatchMode(mode) {
  state.matchMode = Number(mode) === 5 ? 5 : 3;
  state.match = createMatch(state.matchMode);
  return state.matchMode;
}

function getDifficulty() {
  return state.difficulty;
}

function normalizeDifficulty(value) {
  return VALID_DIFFICULTIES.includes(value) ? value : 'normal';
}

function setDifficulty(difficulty) {
  state.difficulty = normalizeDifficulty(difficulty);
  return state.difficulty;
}

function getMatch() {
  return clone(state.match);
}

function resetMatch(mode = state.matchMode) {
  state.match = createMatch(mode);
  return getMatch();
}

function recordMatchRound(result) {
  if (state.match.isComplete) {
    return getMatch();
  }

  state.match.completedRounds += 1;
  if (result === 'player') state.match.playerWins += 1;
  if (result === 'ai') state.match.aiWins += 1;
  if (result === 'draw') state.match.draws += 1;

  const match = state.match;
  const leader = match.playerWins === match.aiWins
    ? null
    : match.playerWins > match.aiWins
      ? 'player'
      : 'ai';

  if (match.playerWins >= match.targetWins) {
    match.isComplete = true;
    match.result = 'player';
  } else if (match.aiWins >= match.targetWins) {
    match.isComplete = true;
    match.result = 'ai';
  } else if (match.completedRounds >= match.mode) {
    match.isComplete = true;
    match.result = leader || 'draw';
  }

  return getMatch();
}

function setCurrentGame(game) {
  state.currentGame = game ? clone(game) : null;
  if (game?.match) {
    state.match = clone(game.match);
  }
}

function getCurrentGame() {
  return state.currentGame ? clone(state.currentGame) : null;
}

function resetAll() {
  state.score = createScore();
  state.matchMode = 3;
  state.difficulty = 'normal';
  state.match = createMatch(3);
  state.currentGame = null;
}

module.exports = {
  VALID_DIFFICULTIES,
  getInitialBoard,
  getScore,
  incrementScore,
  resetScore,
  getMatchMode,
  setMatchMode,
  getDifficulty,
  normalizeDifficulty,
  setDifficulty,
  getMatch,
  resetMatch,
  recordMatchRound,
  setCurrentGame,
  getCurrentGame,
  resetAll,
};
