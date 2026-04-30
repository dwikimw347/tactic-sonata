const API_BASE = '/api/game';

const BACKEND_UNAVAILABLE_MESSAGE = 'Welcome, wanderer, to this humble grid. I am Phrolova, the silent conductor of souls... come, let us begin our solemn symphony of life and death.';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const IS_LOCAL_HOST = LOCAL_HOSTS.has(window.location.hostname);
const API_BASE_URL = window.TACTIC_SONATA_API_BASE_URL || (IS_LOCAL_HOST ? 'http://localhost:3000' : '');
const STATIC_HOST_LOCAL_MODE = !IS_LOCAL_HOST && !window.TACTIC_SONATA_API_BASE_URL;

const state = {
  selectedSymbol: 'X',
  selectedDifficulty: 'normal',
  selectedMatchMode: 3,
  game: null,
  muted: false,
  audioReady: false,
  insightHintIndex: null,
  shieldHintIndex: null,
  maestroAbilityCells: [],
  maestroBoardEffect: null,
  aiThinking: false,
  phrolovaEffectTimer: null,
  maestroEffectTimer: null,
  abilityToastTimer: null,
  useLocalMode: STATIC_HOST_LOCAL_MODE,
  backendWarningShown: false,
  pendingSystemMessage: STATIC_HOST_LOCAL_MODE ? BACKEND_UNAVAILABLE_MESSAGE : '',
  localScore: { wins: 0, losses: 0, draws: 0 },
  localMatch: null,
  localGame: null,
};

const PHROLOVA_AVATARS = {
  play: 'assets/images/phrolova_play.jpeg',
  win: 'assets/images/phrolova_win.jpeg',
  lose: 'assets/images/phrolova_lose.jpeg',
  draw: 'assets/images/phrolova_draw.jpeg',
};

const PHROLOVA_EFFECT_CLASSES = [
  'phrolova-block',
  'phrolova-prediction',
  'phrolova-random',
  'phrolova-win-threat',
];

const PHROLOVA_SKILL_SOUNDS = {
  'Crimson Interruption': 'skillBlock',
  'Symphony Prediction': 'skillPrediction',
  'Echo Manipulation': 'skillRandom',
  'Perfect Cadence': 'skillCadence',
};

const BGM_VOLUME = 0.15;
const VOICE_VOLUME = 0.85;
const SFX_VOLUME = 0.6;

const PHROLOVA_DIALOGS = {
  playing: [
    {
      text: "Quiet thy thoughts, for this grid becometh a sonoro sphere that I conduct with solemn grace.",
      audio: "assets/audio/phrolova_playing_1.mp3"
    },
    {
      text: "Behold this field of nine fates; each mark a note in the symphony I alone shall guide.",
      audio: "assets/audio/phrolova_playing_2.mp3"
    },
    {
      text: "Move not in haste, mortal, for every stroke echoeth the dance of life and death.",
      audio: "assets/audio/phrolova_playing_3.mp3"
    }
  ],

  win: [
    {
      text: "Ah, the final flourish resoundeth as three marks align in perfect harmony.",
      audio: "assets/audio/phrolova_winning_1.mp3"
    },
    {
      text: "Thus the performance endeth in triumph upon this board of victory.",
      audio: "assets/audio/phrolova_winning_2.mp3"
    },
    {
      text: "Victory’s cadence ringeth clear as frequencies align beneath my baton.",
      audio: "assets/audio/phrolova_winning_3.mp3"
    }
  ],

  lose: [
    {
      text: "A profound lament echoeth as mine harmony fractureth into silence.",
      audio: "assets/audio/phrolova_losing_1.mp3"
    },
    {
      text: "Alas, the melody falleth to ruin, yet defeat begetteth new beginnings.",
      audio: "assets/audio/phrolova_losing_2.mp3"
    },
    {
      text: "The grid hath betrayed me, a somber requiem where my symphony endeth.",
      audio: "assets/audio/phrolova_losing_3.mp3"
    }
  ],

  draw: [
    {
      text: "A rare draw, for the board resteth in perfect equilibrium.",
      audio: "assets/audio/phrolova_draw_1.mp3"
    },
    {
      text: "Neither life nor death claimeth dominion, only suspended harmony.",
      audio: "assets/audio/phrolova_draw_2.mp3"
    },
    {
      text: "How exquisite this stalemate, echoing the eternal veil betwixt worlds.",
      audio: "assets/audio/phrolova_draw_3.mp3"
    }
  ]
};

const MAESTRO_ABILITY_DIALOGS = {
  resonanceOverride: {
    text: 'With a wave of my baton, I attune the frequencies of this grid.',
    audio: 'assets/audio/phrolova_resonance_override.mp3',
  },
  hecatesShadow: {
    text: 'Hecate standeth at the crossroads of fate...',
    audio: 'assets/audio/phrolova_hecate_shadow.mp3',
  },
  symphonyOfRebirth: {
    text: 'Death is but prelude... let the melody be reborn.',
    audio: 'assets/audio/phrolova_symphony_of_rebirth.mp3',
  },
};

let bgMusic = null;
let currentPhrolovaVoice = null;
const audio = {
  click: createAudio('assets/audio/click.wav', false, SFX_VOLUME),
  ai: createAudio('assets/audio/ai-move.wav', false, SFX_VOLUME),
  win: createAudio('assets/audio/win.wav', false, SFX_VOLUME),
  lose: createAudio('assets/audio/lose.wav', false, SFX_VOLUME),
  draw: createAudio('assets/audio/draw.wav', false, SFX_VOLUME),
  skill: createAudio('assets/audio/skill.wav', false, SFX_VOLUME),
  skillPrediction: createAudio('assets/audio/skill_prediction.mp3', false, SFX_VOLUME, 'none'),
  skillBlock: createAudio('assets/audio/skill_block.mp3', false, SFX_VOLUME, 'none'),
  skillRandom: createAudio('assets/audio/skill_random.mp3', false, SFX_VOLUME, 'none'),
  skillCadence: createAudio('assets/audio/skill_cadence.mp3', false, SFX_VOLUME, 'none'),
};

const elements = {
  titleScreen: document.querySelector('#titleScreen'),
  modeSelectScreen: document.querySelector('#modeSelectScreen'),
  gameScreen: document.querySelector('#gameScreen'),
  startGameIntroBtn: document.querySelector('#startGameIntroBtn'),
  vsPhrolovaBtn: document.querySelector('#vsPhrolovaBtn'),
  multiplayerBtn: document.querySelector('#multiplayerBtn'),
  multiplayerMessage: document.querySelector('#multiplayerMessage'),
  board: document.querySelector('#board'),
  turnLabel: document.querySelector('#turnLabel'),
  dialogText: document.querySelector('#dialogText'),
  phrolovaSkillName: document.querySelector('#phrolovaSkillName'),
  playerMarkDisplay: document.querySelector('#playerMarkDisplay'),
  winsScore: document.querySelector('#winsScore'),
  lossesScore: document.querySelector('#lossesScore'),
  drawsScore: document.querySelector('#drawsScore'),
  matchLabel: document.querySelector('#matchLabel'),
  roundLabel: document.querySelector('#roundLabel'),
  playerMatchWins: document.querySelector('#playerMatchWins'),
  aiMatchWins: document.querySelector('#aiMatchWins'),
  matchDraws: document.querySelector('#matchDraws'),
  startButton: document.querySelector('#startButton'),
  nextRoundButton: document.querySelector('#nextRoundButton'),
  resetButton: document.querySelector('#resetButton'),
  muteButton: document.querySelector('#muteButton'),
  backToModeFromPhrolova: document.querySelector('#backToModeFromPhrolova'),
  difficultySelect: document.querySelector('#difficultySelect'),
  difficultyDescription: document.querySelector('#difficultyDescription'),
  matchModeSelect: document.querySelector('#matchModeSelect'),
  symbolButtons: [...document.querySelectorAll('[data-symbol]')],
  insightSkillButton: document.querySelector('#insightSkillButton'),
  undoSkillButton: document.querySelector('#undoSkillButton'),
  shieldSkillCard: document.querySelector('#shieldSkillCard'),
  insightSkillStatus: document.querySelector('#insightSkillStatus'),
  undoSkillStatus: document.querySelector('#undoSkillStatus'),
  shieldSkillStatus: document.querySelector('#shieldSkillStatus'),
  shieldSkillHint: document.querySelector('#shieldSkillHint'),
  useShieldButton: document.querySelector('#useShieldButton'),
  modal: document.querySelector('#matchModal'),
  modalTitle: document.querySelector('#modalTitle'),
  modalText: document.querySelector('#modalText'),
  modalCloseButton: document.querySelector('#modalCloseButton'),
};

function createAudio(src, loop = false, volume = 0.4, preload = 'auto') {
  const track = new Audio(src);
  track.loop = loop;
  track.volume = volume;
  track.preload = preload;
  track.dataset.available = 'true';
  track.addEventListener('error', () => {
    track.dataset.available = 'false';
  });
  return track;
}

function getRandomDialog(type) {
  const pool = PHROLOVA_DIALOGS[type] || PHROLOVA_DIALOGS.playing;
  return pool[Math.floor(Math.random() * pool.length)];
}
function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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

const LOCAL_DIFFICULTY_CHANCES = Object.freeze({
  easy: { cadence: 0.3, interruption: 0.2, prediction: 0 },
  normal: { cadence: 0.7, interruption: 0.5, prediction: 0.3 },
  hard: { cadence: 1, interruption: 1, prediction: 0.8 },
  impossible: { cadence: 1, interruption: 1, prediction: 1 },
  maestro: { cadence: 1, interruption: 1, prediction: 1 },
});

const LOCAL_PHROLOVA_SKILLS = Object.freeze({
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeDifficulty(value) {
  return LOCAL_DIFFICULTY_CHANCES[value] ? value : 'normal';
}

function normalizeBoard(board) {
  return Array.isArray(board) && board.length === 9
    ? board.map((cell) => (cell === 'X' || cell === 'O' ? cell : null))
    : Array(9).fill(null);
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
      return { winner: safeBoard[a], winningPattern: pattern, isDraw: false };
    }
  }

  return {
    winner: null,
    winningPattern: [],
    isDraw: safeBoard.every(Boolean),
  };
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

function findBestMove(board, aiSymbol, playerSymbol) {
  const safeBoard = normalizeBoard(board);
  const moves = getAvailableMoves(safeBoard);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = -Infinity;
  moves.forEach((move) => {
    safeBoard[move] = aiSymbol;
    const score = minimax(safeBoard, aiSymbol, playerSymbol, false);
    safeBoard[move] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });
  return bestMove;
}

function findLineGap(board, symbol) {
  for (const pattern of WIN_PATTERNS) {
    const cells = pattern.map((index) => board[index]);
    const symbolCount = cells.filter((cell) => cell === symbol).length;
    const emptyOffset = cells.findIndex((cell) => !cell);
    if (symbolCount === 2 && emptyOffset !== -1) return pattern[emptyOffset];
  }
  return null;
}

function countOpenThreats(board, symbol) {
  return WIN_PATTERNS.reduce((count, pattern) => {
    const symbolCells = pattern.filter((index) => board[index] === symbol);
    const emptyCells = pattern.filter((index) => !board[index]);
    return count + (symbolCells.length === 2 && emptyCells.length === 1 ? 1 : 0);
  }, 0);
}

function ensureLocalMaestroState(game) {
  if (!game.abilityUsage) game.abilityUsage = { resonanceOverrideUsed: false, symphonyOfRebirthUsed: false };
  if (!game.temporaryEffects) game.temporaryEffects = { hecateShadow: null };
  if (!Array.isArray(game.boardHistory)) game.boardHistory = [];
  if (!game.maestro) game.maestro = {};
  game.maestro.resonanceUsed = Boolean(game.maestro.resonanceUsed || game.abilityUsage.resonanceOverrideUsed);
  game.maestro.symphonyUsed = Boolean(game.maestro.symphonyUsed || game.abilityUsage.symphonyOfRebirthUsed);
  game.maestro.shadowCount = Number.isInteger(game.maestro.shadowCount) ? game.maestro.shadowCount : 0;
  return game;
}

function findLocalHecateTarget(game) {
  const profiles = WIN_PATTERNS.map((pattern) => {
    const playerCells = pattern.filter((index) => game.board[index] === game.playerSymbol);
    const emptyCells = pattern.filter((index) => !game.board[index]);
    const blocked = pattern.some((index) => game.board[index] && game.board[index] !== game.playerSymbol);
    return { pattern, playerCells, emptyCells, blocked };
  });
  const direct = profiles.find((profile) => profile.playerCells.length === 2 && profile.emptyCells.length === 1);
  if (direct) return { ...direct, emptyCell: direct.emptyCells[0], reason: 'direct-threat' };

  for (const index of getAvailableMoves(game.board)) {
    const nextBoard = [...game.board];
    nextBoard[index] = game.playerSymbol;
    const fork = countOpenThreats(nextBoard, game.playerSymbol) >= 2;
    if (fork) {
      const line = profiles.find((profile) => !profile.blocked && profile.playerCells.length >= 1 && profile.pattern.includes(index));
      if (line) return { ...line, emptyCell: index, reason: 'fork-potential' };
    }
  }

  const developing = profiles.find((profile) => !profile.blocked && profile.playerCells.length === 1 && profile.emptyCells.length === 2);
  return developing ? { ...developing, emptyCell: developing.emptyCells[0], reason: 'developing-line' } : null;
}

function getRandomMove(board) {
  const moves = getAvailableMoves(board);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

function createSkillResult(type, move) {
  return {
    ...LOCAL_PHROLOVA_SKILLS[type],
    move,
  };
}

function chooseLocalPhrolovaSkill({ board, aiSymbol, playerSymbol, difficulty }) {
  const chances = LOCAL_DIFFICULTY_CHANCES[normalizeDifficulty(difficulty)];
  if (getAvailableMoves(board).length === 0) return createSkillResult('echo', null);

  const winningMove = findLineGap(board, aiSymbol);
  if (winningMove !== null && Math.random() < chances.cadence) return createSkillResult('cadence', winningMove);

  const blockingMove = findLineGap(board, playerSymbol);
  if (blockingMove !== null && Math.random() < chances.interruption) return createSkillResult('interruption', blockingMove);

  if (Math.random() < chances.prediction) {
    return createSkillResult('prediction', findBestMove(board, aiSymbol, playerSymbol));
  }

  return createSkillResult('echo', getRandomMove(board));
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

function createLocalSkillState() {
  return {
    insight: { maxUses: 2, used: 0, lastSuggestedMove: null },
    undo: { maxUses: 1, used: 0 },
    harmonyShield: { maxUses: 1, used: false, active: false, pendingBlockMove: null },
  };
}

function createLocalMatch(mode = state.selectedMatchMode) {
  const totalRounds = Number(mode) === 5 ? 5 : 3;
  return {
    mode: totalRounds,
    targetWins: Math.ceil(totalRounds / 2),
    completedRounds: 0,
    playerWins: 0,
    aiWins: 0,
    draws: 0,
    isComplete: false,
    result: null,
    abilityUsage: { symphonyOfRebirthUsed: false },
  };
}

function getLocalMatch() {
  if (!state.localMatch || state.localMatch.mode !== state.selectedMatchMode) {
    state.localMatch = createLocalMatch(state.selectedMatchMode);
  }
  return state.localMatch;
}

function getLocalRound(match) {
  return Math.min(match.completedRounds + 1, match.mode);
}

function localSkillStatus(game) {
  const skills = game?.skills || createLocalSkillState();
  const playerTurn = Boolean(game && game.status === 'playing' && game.currentTurn === game.playerSymbol);
  const lastPlayerMove = game?.history?.some((move) => move.by === 'player');
  const harmony = skills.harmonyShield;
  return {
    insight: {
      maxUses: skills.insight.maxUses,
      used: skills.insight.used,
      remaining: Math.max(skills.insight.maxUses - skills.insight.used, 0),
      lastSuggestedMove: skills.insight.lastSuggestedMove,
      canUse: playerTurn && skills.insight.used < skills.insight.maxUses,
    },
    undo: {
      maxUses: skills.undo.maxUses,
      used: skills.undo.used,
      remaining: Math.max(skills.undo.maxUses - skills.undo.used, 0),
      canUse: Boolean(game && game.status === 'playing' && skills.undo.used < skills.undo.maxUses && lastPlayerMove),
    },
    harmonyShield: {
      maxUses: harmony.maxUses,
      used: harmony.used,
      remaining: harmony.used ? 0 : 1,
      active: harmony.active,
      pendingBlockMove: harmony.pendingBlockMove,
      canUse: playerTurn && harmony.active && harmony.pendingBlockMove !== null,
    },
  };
}

function publicLocalGame(game) {
  if (!game) {
    return {
      status: 'idle',
      board: Array(9).fill(null),
      score: clone(state.localScore),
      match: { ...getLocalMatch(), currentRound: getLocalRound(getLocalMatch()) },
      difficulty: state.selectedDifficulty,
      matchMode: state.selectedMatchMode,
      history: [],
      boardHistory: [],
      skills: localSkillStatus(null),
      phrolovaSkill: null,
      maestroAbility: null,
    };
  }

  return {
    ...clone(game),
    score: clone(state.localScore),
    match: {
      ...clone(game.match),
      currentRound: getLocalRound(game.match),
    },
    skills: localSkillStatus(game),
    phrolovaSkill: toPublicPhrolovaSkill(game.lastPhrolovaSkill),
    maestroAbility: game.lastMaestroAbility || null,
  };
}

function recordLocalRound(result) {
  const match = getLocalMatch();
  match.completedRounds += 1;
  if (result === 'player') match.playerWins += 1;
  if (result === 'ai') match.aiWins += 1;
  if (result === 'draw') match.draws += 1;

  const leader = match.playerWins === match.aiWins ? null : match.playerWins > match.aiWins ? 'player' : 'ai';
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
  return match;
}

function finalizeLocalRound(game, result, winningPattern = []) {
  game.status = 'finished';
  game.winner = result;
  game.winningPattern = winningPattern;
  game.skills.harmonyShield.active = false;
  game.skills.harmonyShield.pendingBlockMove = null;
  if (result === 'player') state.localScore.wins += 1;
  if (result === 'ai') state.localScore.losses += 1;
  if (result === 'draw') state.localScore.draws += 1;
  game.match = recordLocalRound(result);
  state.localGame = game;
  return game;
}

function applyLocalOutcome(game) {
  const outcome = evaluateBoard(game.board);
  if (outcome.winner) {
    return finalizeLocalRound(game, outcome.winner === game.playerSymbol ? 'player' : 'ai', outcome.winningPattern);
  }
  if (outcome.isDraw) return finalizeLocalRound(game, 'draw');
  return game;
}

function findResonanceTarget(game) {
  ensureLocalMaestroState(game);
  if (game.difficulty !== 'maestro' || game.abilityUsage.resonanceOverrideUsed) return null;
  const playerCells = game.board
    .map((cell, index) => (cell === game.playerSymbol ? index : null))
    .filter((index) => index !== null);

  for (const index of playerCells) {
    const nextBoard = [...game.board];
    nextBoard[index] = game.aiSymbol;
    if (evaluateBoard(nextBoard).winner === game.aiSymbol) return index;
  }

  const threat = findLineGap(game.board, game.playerSymbol);
  if (threat !== null) {
    return playerCells.find((index) => WIN_PATTERNS.some((pattern) => pattern.includes(index) && pattern.includes(threat))) ?? null;
  }

  for (const index of playerCells) {
    const nextBoard = [...game.board];
    nextBoard[index] = game.aiSymbol;
    if (countOpenThreats(nextBoard, game.aiSymbol) >= 2) return index;
  }

  const preferred = [4, 0, 2, 6, 8, 1, 3, 5, 7].find((index) => game.board[index] === game.playerSymbol);
  if (preferred !== undefined) return preferred;

  return null;
}

function applyLocalResonance(game) {
  const target = findResonanceTarget(game);
  if (target === null) return null;
  game.boardHistory.push([...game.board]);
  game.board[target] = game.aiSymbol;
  game.abilityUsage.resonanceOverrideUsed = true;
  ensureLocalMaestroState(game).maestro.resonanceUsed = true;
  game.history.push({
    by: 'ai',
    symbol: game.aiSymbol,
    index: target,
    skill: 'Resonance Override',
    effect: 'resonance-override',
    converted: true,
  });
  return {
    name: 'Resonance Override',
    dialogue: 'With a silent wave of my baton, I attune the frequencies of this grid.',
    effect: 'resonance-override',
    affectedCells: [target],
    move: target,
  };
}

function applyLocalHecate(game) {
  ensureLocalMaestroState(game);
  if (game.difficulty !== 'maestro' || game.maestro.shadowCount >= 3 || game.temporaryEffects.hecateShadow) return null;
  const target = findLocalHecateTarget(game);
  if (!target?.playerCells?.length) return null;
  if (game.maestro.shadowCount > 0
    && (!game.abilityUsage.resonanceOverrideUsed || !game.abilityUsage.symphonyOfRebirthUsed)) {
    return null;
  }
  if (game.maestro.shadowCount > 0 && !['direct-threat', 'fork-potential'].includes(target.reason)) return null;
  const shadowCell = target.playerCells[0];
  game.boardHistory.push([...game.board]);
  game.board[shadowCell] = null;
  game.temporaryEffects.hecateShadow = {
    index: shadowCell,
    symbol: game.playerSymbol,
    reason: target.reason,
  };
  game.maestro.shadowCount += 1;
  return {
    name: 'Hecate’s Shadow',
    dialogue: 'Hecate standeth at the crossroads of fate...',
    effect: 'hecate-shadow',
    affectedCells: [shadowCell, target.emptyCell],
    move: null,
  };
}

function restoreLocalHecate(game) {
  const shadow = game.temporaryEffects?.hecateShadow;
  if (!shadow) return null;
  if (!game.board[shadow.index]) game.board[shadow.index] = shadow.symbol;
  game.temporaryEffects.hecateShadow = null;
  return shadow;
}

function canUseLocalSymphony(game, outcome = evaluateBoard(game.board)) {
  ensureLocalMaestroState(game);
  if (game.difficulty !== 'maestro' || game.abilityUsage.symphonyOfRebirthUsed) return false;
  if (game.boardHistory.length < 1) return false;
  if (outcome.winner === game.playerSymbol || outcome.isDraw) return true;
  if (findLineGap(game.board, game.playerSymbol) !== null) return true;
  const moveCount = game.board.filter(Boolean).length;
  const aiWin = findLineGap(game.board, game.aiSymbol);
  const playerBlock = findLineGap(game.board, game.playerSymbol);
  return (game.maestro.shadowCount > 0 && game.abilityUsage.resonanceOverrideUsed && moveCount >= 4)
    || (aiWin === null && playerBlock === null && getAvailableMoves(game.board).length <= 4);
}

function applyLocalSymphony(game) {
  ensureLocalMaestroState(game);
  const rollbackIndex = Math.max(0, game.boardHistory.length - 3);
  const rollbackBoard = game.boardHistory[rollbackIndex];
  if (!rollbackBoard) return null;
  game.board = [...rollbackBoard];
  game.boardHistory = game.boardHistory.slice(0, rollbackIndex + 1);
  game.status = 'playing';
  game.winner = null;
  game.winningPattern = [];
  game.temporaryEffects.hecateShadow = null;
  game.abilityUsage.symphonyOfRebirthUsed = true;
  game.maestro.symphonyUsed = true;
  game.match.abilityUsage = { ...(game.match.abilityUsage || {}), symphonyOfRebirthUsed: true };
  let bonusMove = 4;
  if (game.board[bonusMove]) bonusMove = findBestMove(game.board, game.aiSymbol, game.playerSymbol);
  if (bonusMove !== null && !game.board[bonusMove]) {
    game.board[bonusMove] = game.aiSymbol;
    game.history.push({ by: 'ai', symbol: game.aiSymbol, index: bonusMove, skill: 'Symphony of Rebirth', effect: 'symphony-rebirth' });
  }
  game.currentTurn = game.playerSymbol;
  return {
    name: 'Symphony of Rebirth',
    dialogue: 'Death is but prelude... let the melody be reborn.',
    effect: 'symphony-rebirth',
    affectedCells: bonusMove !== null ? [bonusMove] : [],
    move: bonusMove,
  };
}

function chooseLocalMaestroBaitMove(game) {
  const moves = getAvailableMoves(game.board);
  if (!moves.length) return null;
  const winningMove = findLineGap(game.board, game.aiSymbol);
  if (winningMove !== null && game.maestro.shadowCount > 0 && game.abilityUsage.resonanceOverrideUsed) return winningMove;
  const blockingMove = findLineGap(game.board, game.playerSymbol);
  if (blockingMove !== null && game.maestro.shadowCount < 2) {
    const baitMove = moves.find((move) => move !== blockingMove);
    if (baitMove !== undefined) return baitMove;
  }
  return [4, 0, 2, 6, 8, 1, 3, 5, 7].find((index) => moves.includes(index)) ?? findBestMove(game.board, game.aiSymbol, game.playerSymbol);
}

function armLocalHarmonyShield(game) {
  const shield = game.skills.harmonyShield;
  if (shield.used || game.status !== 'playing' || game.currentTurn !== game.playerSymbol) return;
  const blockMove = findLineGap(game.board, game.aiSymbol);
  if (blockMove === null) return;
  shield.used = true;
  shield.active = true;
  shield.pendingBlockMove = blockMove;
}

function performLocalAiMove(game) {
  ensureLocalMaestroState(game);
  let maestroAbility = null;
  let aiChoice = chooseLocalPhrolovaSkill({
    board: game.board,
    aiSymbol: game.aiSymbol,
    playerSymbol: game.playerSymbol,
    difficulty: game.difficulty,
  });

  if (game.difficulty === 'maestro') {
    maestroAbility = applyLocalHecate(game);
    if (!maestroAbility) {
      maestroAbility = applyLocalResonance(game);
      if (maestroAbility) {
        game.lastMaestroAbility = maestroAbility;
        applyLocalOutcome(game);
        if (game.status === 'playing') game.currentTurn = game.playerSymbol;
        return { ...aiChoice, move: maestroAbility.move, maestroAbility };
      }
    }
    if (!maestroAbility && canUseLocalSymphony(game)) {
      maestroAbility = applyLocalSymphony(game);
      game.lastMaestroAbility = maestroAbility;
      applyLocalOutcome(game);
      return { ...aiChoice, move: maestroAbility?.move ?? null, maestroAbility };
    }
  }

  if (game.difficulty === 'maestro') {
    aiChoice = {
      ...aiChoice,
      skill: maestroAbility?.name || aiChoice.skill,
      dialogue: maestroAbility?.dialogue || aiChoice.dialogue,
      effect: maestroAbility?.effect || aiChoice.effect,
      strategy: maestroAbility ? 'maestro-bait' : 'maestro-bait',
      move: chooseLocalMaestroBaitMove(game),
    };
  }

  const move = aiChoice.move;
  if (move === null || game.board[move]) {
    restoreLocalHecate(game);
    game.lastPhrolovaSkill = aiChoice;
    game.currentTurn = game.playerSymbol;
    game.lastMaestroAbility = maestroAbility;
    return { ...aiChoice, maestroAbility };
  }

  game.boardHistory.push([...game.board]);
  game.board[move] = game.aiSymbol;
  const restoredShadow = restoreLocalHecate(game);
  if (maestroAbility && restoredShadow) {
    maestroAbility.affectedCells = [...new Set([...(maestroAbility.affectedCells || []), restoredShadow.index])];
  }
  game.lastPhrolovaSkill = aiChoice;
  game.lastMaestroAbility = maestroAbility;
  game.lastMove = { by: 'ai', index: move, strategy: aiChoice.strategy };
  game.history.push({
    by: 'ai',
    symbol: game.aiSymbol,
    index: move,
    strategy: aiChoice.strategy,
    skill: aiChoice.skill,
    effect: aiChoice.effect,
  });

  applyLocalOutcome(game);
  if (game.status === 'playing') {
    game.currentTurn = game.playerSymbol;
    armLocalHarmonyShield(game);
  }

  return { ...aiChoice, maestroAbility: null };
}

function oppositeSymbol(symbol) {
  return symbol === 'X' ? 'O' : 'X';
}

function createLocalGame({ playerSymbol = state.selectedSymbol, difficulty = state.selectedDifficulty, matchMode = state.selectedMatchMode, preserveMatch = false } = {}) {
  state.selectedSymbol = playerSymbol === 'O' ? 'O' : 'X';
  state.selectedDifficulty = normalizeDifficulty(difficulty);
  state.selectedMatchMode = Number(matchMode) === 5 ? 5 : 3;

  const existingMatch = getLocalMatch();
  const match = !preserveMatch || existingMatch.isComplete || existingMatch.mode !== state.selectedMatchMode
    ? createLocalMatch(state.selectedMatchMode)
    : existingMatch;
  state.localMatch = match;

  const game = {
    board: Array(9).fill(null),
    playerSymbol: state.selectedSymbol,
    aiSymbol: oppositeSymbol(state.selectedSymbol),
    currentTurn: 'X',
    status: 'playing',
    winner: null,
    winningPattern: [],
    difficulty: state.selectedDifficulty,
    matchMode: state.selectedMatchMode,
    match,
    skills: createLocalSkillState(),
    history: [],
    boardHistory: [],
    abilityUsage: { resonanceOverrideUsed: false, symphonyOfRebirthUsed: false },
    temporaryEffects: { hecateShadow: null },
    maestro: { resonanceUsed: false, symphonyUsed: false, shadowCount: 0 },
    lastPhrolovaSkill: null,
    lastMaestroAbility: null,
    lastMove: null,
  };

  if (game.aiSymbol === 'X') performLocalAiMove(game);
  state.localGame = game;
  return game;
}

function withLocalNotice(data) {
  if (state.pendingSystemMessage) {
    const systemMessage = state.pendingSystemMessage;
    state.pendingSystemMessage = '';
    return { ...data, systemMessage };
  }
  return data;
}

function enableLocalMode() {
  if (!state.useLocalMode) {
    state.useLocalMode = true;
    state.pendingSystemMessage = BACKEND_UNAVAILABLE_MESSAGE;
  }
}

function parseRequestBody(options = {}) {
  if (!options.body) return {};
  try {
    return JSON.parse(options.body);
  } catch (error) {
    return {};
  }
}

function localStart(payload) {
  const game = createLocalGame(payload);
  return withLocalNotice({
    game: publicLocalGame(game),
    phrolovaSkill: toPublicPhrolovaSkill(game.lastPhrolovaSkill),
    maestroAbility: game.lastMaestroAbility,
  });
}

function localMove(payload) {
  const game = state.localGame;
  const index = Number(payload.index);
  if (!game || game.status !== 'playing') throw new Error('No active performance awaits your move.');
  if (game.currentTurn !== game.playerSymbol) throw new Error('The baton is not yet yours.');
  if (!Number.isInteger(index) || index < 0 || index > 8 || game.board[index]) {
    throw new Error('That note cannot be played.');
  }

  game.boardHistory.push([...game.board]);
  game.board[index] = game.playerSymbol;
  game.lastMove = { by: 'player', index };
  game.history.push({ by: 'player', symbol: game.playerSymbol, index });
  game.skills.harmonyShield.active = false;
  game.skills.harmonyShield.pendingBlockMove = null;
  game.skills.insight.lastSuggestedMove = null;
  game.currentTurn = game.aiSymbol;

  let maestroAbility = null;
  const playerOutcome = evaluateBoard(game.board);
  if (game.difficulty === 'maestro' && (playerOutcome.winner || playerOutcome.isDraw) && canUseLocalSymphony(game, playerOutcome)) {
    maestroAbility = applyLocalSymphony(game);
    game.lastMaestroAbility = maestroAbility;
  } else {
    applyLocalOutcome(game);
  }

  let phrolovaSkill = null;
  if (game.status === 'playing') {
    phrolovaSkill = performLocalAiMove(game);
    maestroAbility = phrolovaSkill.maestroAbility || maestroAbility || null;
  }

  state.localGame = game;
  return withLocalNotice({
    game: publicLocalGame(game),
    board: game.board,
    currentTurn: game.currentTurn,
    winner: game.winner,
    aiMove: phrolovaSkill?.move ?? null,
    phrolovaSkill: toPublicPhrolovaSkill(phrolovaSkill),
    maestroAbility,
  });
}

function findLocalInsightMove(game) {
  const winningMove = findLineGap(game.board, game.playerSymbol);
  if (winningMove !== null) return winningMove;
  const blockMove = findLineGap(game.board, game.aiSymbol);
  if (blockMove !== null) return blockMove;
  if (!game.board[4]) return 4;
  return findBestMove(game.board, game.playerSymbol, game.aiSymbol) ?? getAvailableMoves(game.board)[0] ?? null;
}

function localUseInsight() {
  const game = state.localGame;
  if (!game || game.status !== 'playing' || game.currentTurn !== game.playerSymbol) {
    throw new Error('Insight can only be heard during your measure.');
  }
  if (game.skills.insight.used >= game.skills.insight.maxUses) {
    throw new Error('The silence has no more guidance to lend.');
  }
  const bestMoveIndex = findLocalInsightMove(game);
  if (bestMoveIndex === null) throw new Error('No legal note remains upon the board.');
  game.skills.insight.used += 1;
  game.skills.insight.lastSuggestedMove = bestMoveIndex;
  return withLocalNotice({ bestMoveIndex, game: publicLocalGame(game), skills: localSkillStatus(game) });
}

function localUseUndo() {
  const game = state.localGame;
  if (!game || game.status !== 'playing' || game.skills.undo.used >= game.skills.undo.maxUses) {
    throw new Error('Fate cannot be rewritten now.');
  }
  const lastPlayerIndex = [...game.history].map((move, index) => ({ move, index })).reverse().find((item) => item.move.by === 'player')?.index ?? -1;
  if (lastPlayerIndex === -1) throw new Error('There is no player note to erase.');
  const removedMoves = game.history.slice(lastPlayerIndex);
  removedMoves.forEach((move) => {
    game.board[move.index] = null;
  });
  game.history = game.history.slice(0, lastPlayerIndex);
  game.currentTurn = game.playerSymbol;
  game.status = 'playing';
  game.winner = null;
  game.winningPattern = [];
  game.lastMove = game.history[game.history.length - 1] || null;
  game.skills.undo.used += 1;
  game.skills.insight.lastSuggestedMove = null;
  game.skills.harmonyShield.active = false;
  game.skills.harmonyShield.pendingBlockMove = null;
  return withLocalNotice({ game: publicLocalGame(game), removedMoves, skills: localSkillStatus(game) });
}

function localUseShield() {
  const game = state.localGame;
  if (!game || game.status !== 'playing') throw new Error('Harmony Shield cannot guard a silent stage.');
  armLocalHarmonyShield(game);
  const move = game.skills.harmonyShield.pendingBlockMove;
  if (move === null || game.board[move]) throw new Error('No fatal phrase needs harmony yet.');

  game.boardHistory.push([...game.board]);
  game.board[move] = game.playerSymbol;
  game.history.push({ by: 'player', symbol: game.playerSymbol, index: move, skill: 'harmonyShield' });
  game.skills.harmonyShield.active = false;
  game.skills.harmonyShield.pendingBlockMove = null;
  game.currentTurn = game.aiSymbol;
  let maestroAbility = null;
  const playerOutcome = evaluateBoard(game.board);
  if (game.difficulty === 'maestro' && (playerOutcome.winner || playerOutcome.isDraw) && canUseLocalSymphony(game, playerOutcome)) {
    maestroAbility = applyLocalSymphony(game);
    game.lastMaestroAbility = maestroAbility;
  } else {
    applyLocalOutcome(game);
  }

  let phrolovaSkill = null;
  if (game.status === 'playing') phrolovaSkill = performLocalAiMove(game);
  maestroAbility = phrolovaSkill?.maestroAbility ?? maestroAbility;
  return withLocalNotice({
    game: publicLocalGame(game),
    aiMove: phrolovaSkill?.move ?? null,
    phrolovaSkill: toPublicPhrolovaSkill(phrolovaSkill),
    maestroAbility: maestroAbility ?? null,
  });
}

function localReset() {
  state.localScore = { wins: 0, losses: 0, draws: 0 };
  state.localMatch = createLocalMatch(state.selectedMatchMode);
  state.localGame = null;
  return withLocalNotice({ game: publicLocalGame(null) });
}

function localApiRequest(path, options = {}) {
  const payload = parseRequestBody(options);
  switch (path) {
    case '/status':
      return Promise.resolve(withLocalNotice({ game: publicLocalGame(state.localGame) }));
    case '/start':
      return Promise.resolve(localStart(payload));
    case '/move':
      return Promise.resolve(localMove(payload));
    case '/reset':
      return Promise.resolve(localReset());
    case '/difficulty':
      state.selectedDifficulty = normalizeDifficulty(payload.difficulty);
      return Promise.resolve(withLocalNotice({ difficulty: state.selectedDifficulty }));
    case '/match-mode':
      state.selectedMatchMode = Number(payload.mode) === 5 ? 5 : 3;
      state.localMatch = createLocalMatch(state.selectedMatchMode);
      state.localGame = null;
      return Promise.resolve(withLocalNotice({ matchMode: state.selectedMatchMode, match: clone(state.localMatch) }));
    case '/skill/insight':
      return Promise.resolve(localUseInsight());
    case '/skill/undo':
      return Promise.resolve(localUseUndo());
    case '/skill/shield':
      return Promise.resolve(localUseShield());
    default:
      return Promise.reject(new Error(BACKEND_UNAVAILABLE_MESSAGE));
  }
}

async function apiRequest(path, options = {}) {
  if (state.useLocalMode) {
    return localApiRequest(path, options);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (error) {
      payload = null;
    }

    if (response.status === 404 || !payload) {
      enableLocalMode();
      return localApiRequest(path, options);
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || 'The performance stumbled.');
    }

    return payload.data;
  } catch (error) {
    if (error instanceof TypeError) {
      enableLocalMode();
      return localApiRequest(path, options);
    }
    throw error;
  }
}

function safePlay(name) {
  if (state.muted || !audio[name] || audio[name].dataset.available === 'false') return;

  try {
    audio[name].currentTime = 0;
    audio[name].play().catch(() => undefined);
  } catch (error) {
    audio[name].dataset.available = 'false';
  }
}

function playClickSfx() {
  safePlay('click');
}

function showScreen(screenId) {
  ['titleScreen', 'modeSelectScreen', 'gameScreen', 'multiplayerScreen'].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.hidden = id !== screenId;
  });
}

function stopAllBackgroundAudioElements() {
  document.querySelectorAll('audio').forEach((track) => {
    const src = track.currentSrc || track.src || '';
    if (src.includes('background.wav')) {
      track.pause();
      track.currentTime = 0;
    }
  });
}

function initBackgroundMusic() {
  if (!bgMusic) {
    bgMusic = new Audio('assets/audio/background.wav');
    bgMusic.addEventListener('error', () => {
      bgMusic.dataset.available = 'false';
    });
  }

  bgMusic.loop = true;
  bgMusic.volume = BGM_VOLUME;
  bgMusic.preload = 'auto';
  bgMusic.dataset.available = bgMusic.dataset.available || 'true';
}

function playBackgroundMusic() {
  initBackgroundMusic();
  if (state.muted || !bgMusic || bgMusic.dataset.available === 'false') return;

  bgMusic.loop = true;
  bgMusic.volume = BGM_VOLUME;

  if (bgMusic.paused) {
    bgMusic.play().catch(() => undefined);
  }
}

function stopBackgroundMusic() {
  if (!bgMusic) return;

  bgMusic.pause();
  bgMusic.currentTime = 0;
}

function startBgmOnce() {
  if (state.audioReady || state.muted) return;
  state.audioReady = true;
  playBackgroundMusic();
}

function stopPhrolovaVoice() {
  if (!currentPhrolovaVoice) return;

  currentPhrolovaVoice.pause();
  currentPhrolovaVoice.currentTime = 0;
  currentPhrolovaVoice = null;
}

function playPhrolovaVoice(audioSrc, volume = VOICE_VOLUME) {
  if (!audioSrc || state.muted) return;

  stopPhrolovaVoice();

  try {
    currentPhrolovaVoice = new Audio(audioSrc);
    currentPhrolovaVoice.volume = volume;
    currentPhrolovaVoice.addEventListener('error', () => undefined);
    currentPhrolovaVoice.onended = () => {
      currentPhrolovaVoice = null;
    };
    currentPhrolovaVoice.play().catch(() => undefined);
  } catch (error) {
    console.warn('Phrolova voice failed:', error);
  }
}

function playPhrolovaWelcome() {
  playPhrolovaVoice('assets/audio/phrolova_welcome.mp3', VOICE_VOLUME);
}

function stopModeAudio() {
  stopBackgroundMusic();
  stopPhrolovaVoice();
  state.audioReady = false;
}

window.TacTicStopModeAudio = stopModeAudio;

function initPhrolovaVideo() {
  const phrolovaVideo = document.querySelector('.phrolova-video');
  if (!phrolovaVideo) return;

  phrolovaVideo.muted = true;
  phrolovaVideo.volume = 0;
  phrolovaVideo.play().catch(() => undefined);
}

function setDialog(text) {
  if (!elements.dialogText) return;

  elements.dialogText.classList.remove('dialog-changing');
  void elements.dialogText.offsetWidth;
  elements.dialogText.textContent = text;
  elements.dialogText.classList.add('dialog-changing');
}

function updatePhrolovaDialog(type) {
  const el = document.querySelector('.dialog-text');
  if (!el) return;

  const selectedDialog = getRandomDialog(type);
  el.classList.remove('dialog-changing');
  void el.offsetWidth;
  el.textContent = selectedDialog.text;
  el.classList.add('dialog-changing');
  playPhrolovaVoice(selectedDialog.audio);
}

function normalizeMaestroAbilityName(name) {
  if (!name) return null;

  const key = String(name).toLowerCase();
  if (key.includes('resonance')) return 'resonanceOverride';
  if (key.includes('hecate')) return 'hecatesShadow';
  if (key.includes('symphony')) return 'symphonyOfRebirth';
  return null;
}

function updateMaestroAbilityDialog(abilityName) {
  const normalized = normalizeMaestroAbilityName(abilityName);
  if (!normalized) return false;

  const abilityDialog = MAESTRO_ABILITY_DIALOGS[normalized];
  if (!abilityDialog) return false;

  const dialogEl = document.querySelector('.dialog-text');
  if (dialogEl) {
    dialogEl.classList.remove('dialog-changing');
    void dialogEl.offsetWidth;
    dialogEl.textContent = abilityDialog.text;
    dialogEl.classList.add('dialog-changing');
  }

  playPhrolovaVoice(abilityDialog.audio, VOICE_VOLUME);
  return true;
}

function showAbilityToast(text, effectClass = '') {
  const el = document.getElementById('abilityToast');
  if (!el) return;

  if (state.abilityToastTimer) {
    window.clearTimeout(state.abilityToastTimer);
    state.abilityToastTimer = null;
  }

  el.textContent = text;
  el.className = `ability-toast ${effectClass || ''}`.trim();
  el.classList.add('show');

  state.abilityToastTimer = window.setTimeout(() => {
    el.classList.remove('show');
    state.abilityToastTimer = null;
  }, 1800);
}

function handlePhrolovaTurn({ abilityName = null, abilityEffect = '', endState = null } = {}) {
  if (abilityName) {
    const handled = updateMaestroAbilityDialog(abilityName);
    if (handled) {
      showAbilityToast(abilityName, abilityEffect);
      return true;
    }
  }

  if (endState) {
    updatePhrolovaDialog(endState);
    return true;
  }

  updatePhrolovaDialog('playing');
  return true;
}

function setPhrolovaSkillDisplay(phrolovaSkill) {
  if (!elements.phrolovaSkillName) return;

  elements.phrolovaSkillName.textContent = phrolovaSkill?.name || 'Awaiting movement...';
  elements.phrolovaSkillName.classList.toggle('active', Boolean(phrolovaSkill));
}

function playPhrolovaSkillSound(phrolovaSkill) {
  const soundName = PHROLOVA_SKILL_SOUNDS[phrolovaSkill?.name];
  if (soundName) {
    safePlay(soundName);
    return;
  }

  safePlay('skill');
}

function applyPhrolovaBoardEffect(phrolovaSkill) {
  if (!phrolovaSkill?.effect) return;

  PHROLOVA_EFFECT_CLASSES.forEach((className) => {
    elements.board.classList.remove(className);
  });

  window.clearTimeout(state.phrolovaEffectTimer);
  elements.board.classList.add(phrolovaSkill.effect);
  state.phrolovaEffectTimer = window.setTimeout(() => {
    elements.board.classList.remove(phrolovaSkill.effect);
  }, 850);
}

function setPhrolovaAvatar(avatarState) {
  const avatar = document.getElementById('phrolovaAvatar');
  if (!avatar) return;

  const nextState = PHROLOVA_AVATARS[avatarState] ? avatarState : 'play';
  const nextSrc = PHROLOVA_AVATARS[nextState];
  if (avatar.dataset.avatarState === nextState) return;

  avatar.dataset.avatarState = nextState;
  avatar.classList.add('avatar-changing');
  avatar.src = nextSrc;

  window.setTimeout(() => {
    avatar.classList.remove('avatar-changing');
  }, 250);
}

function syncSkillHints(game) {
  state.maestroAbilityCells = [];
  state.maestroBoardEffect = null;
  if (!game || game.status !== 'playing') {
    state.insightHintIndex = null;
    state.shieldHintIndex = null;
    return;
  }

  state.insightHintIndex = game.skills?.insight?.lastSuggestedMove ?? null;
  state.shieldHintIndex = game.skills?.harmonyShield?.active
    ? game.skills.harmonyShield.pendingBlockMove
    : null;
}

function renderBoard(game) {
  const board = game?.board || Array(9).fill(null);
  const winningPattern = game?.winningPattern || [];
  const isPlayable = game?.status === 'playing' && game.currentTurn === game.playerSymbol && !state.aiThinking;

  elements.board.classList.toggle('is-active', game?.status === 'playing');
  elements.board.classList.toggle('is-locked', Boolean(state.aiThinking || (game?.status === 'playing' && game.currentTurn !== game.playerSymbol)));
  elements.board.innerHTML = '';
  board.forEach((cell, index) => {
    const button = document.createElement('button');
    button.className = 'cell';
    button.type = 'button';
    button.textContent = cell || '';
    button.setAttribute('aria-label', `Cell ${index + 1}${cell ? ` marked ${cell}` : ''}`);

    if (cell) button.classList.add('marked');
    if (winningPattern.includes(index)) button.classList.add('win');
    if (state.insightHintIndex === index && !cell) button.classList.add('insight-hint');
    if (state.shieldHintIndex === index && !cell) button.classList.add('shield-hint');
    if (state.maestroAbilityCells.includes(index)) {
      button.classList.add(state.maestroBoardEffect || 'maestro-affected');
    }
    if (!isPlayable || cell) button.disabled = true;

    button.addEventListener('click', () => handlePlayerMove(index));
    elements.board.appendChild(button);
  });
}

function renderScore(game) {
  const score = game?.score || { wins: 0, losses: 0, draws: 0 };
  const match = game?.match || {
    mode: state.selectedMatchMode,
    currentRound: 1,
    playerWins: 0,
    aiWins: 0,
    draws: 0,
  };

  elements.winsScore.textContent = score.wins;
  elements.lossesScore.textContent = score.losses;
  elements.drawsScore.textContent = score.draws;
  elements.matchLabel.textContent = `Best of ${match.mode || state.selectedMatchMode}`;
  elements.roundLabel.textContent = `Round ${match.currentRound || 1}`;
  elements.playerMatchWins.textContent = `You ${match.playerWins || 0}`;
  elements.aiMatchWins.textContent = `Phrolova ${match.aiWins || 0}`;
  elements.matchDraws.textContent = `Draws ${match.draws || 0}`;
}

function renderSkills(game) {
  const skills = game?.skills || {
    insight: { remaining: 2, maxUses: 2, canUse: false },
    undo: { remaining: 1, maxUses: 1, canUse: false },
    harmonyShield: { remaining: 1, active: false, pendingBlockMove: null, canUse: false },
  };
  const harmony = skills.harmonyShield;

  elements.insightSkillStatus.textContent = `${skills.insight.remaining}/${skills.insight.maxUses} left`;
  elements.undoSkillStatus.textContent = `${skills.undo.remaining}/${skills.undo.maxUses} left`;
  elements.insightSkillButton.disabled = state.aiThinking || !skills.insight.canUse;
  elements.undoSkillButton.disabled = state.aiThinking || !skills.undo.canUse;

  elements.shieldSkillCard.classList.toggle('active', Boolean(harmony.active));
  elements.shieldSkillStatus.textContent = harmony.active
    ? `Block cell ${harmony.pendingBlockMove + 1}`
    : harmony.remaining > 0
      ? 'Ready'
      : 'Spent';
  elements.shieldSkillHint.textContent = harmony.active
    ? 'Block the glow.'
    : harmony.remaining > 0
      ? 'Waiting.'
      : 'Spent.';
  elements.useShieldButton.disabled = state.aiThinking || !harmony.canUse;
}

function renderTurn(game) {
  elements.turnLabel.className = '';

  if (!game || game.status === 'idle') {
    elements.turnLabel.textContent = 'AWAITING OVERTURE';
    elements.turnLabel.classList.add('turn-idle');
    return;
  }

  if (state.aiThinking) {
    elements.turnLabel.textContent = 'PHROLOVA IS CONDUCTING...';
    elements.turnLabel.classList.add('turn-ai');
    return;
  }

  if (game.status === 'finished') {
    if (game.winner === 'player') elements.turnLabel.textContent = 'YOU WON THIS MOVEMENT';
    if (game.winner === 'ai') elements.turnLabel.textContent = 'PHROLOVA CLAIMED THE CADENCE';
    if (game.winner === 'draw') elements.turnLabel.textContent = 'DRAW — SUSPENDED CHORD';
    elements.turnLabel.classList.add('turn-finished');
    return;
  }

  if (game.currentTurn === game.playerSymbol) {
    elements.turnLabel.textContent = `YOUR TURN — ${game.playerSymbol}`;
    elements.turnLabel.classList.add('turn-player');
    return;
  }

  elements.turnLabel.textContent = 'PHROLOVA IS CONDUCTING...';
  elements.turnLabel.classList.add('turn-ai');
}

function renderControls(game) {
  const canContinueMatch = game?.status === 'finished' && !game?.match?.isComplete;
  const matchComplete = game?.match?.isComplete;

  elements.nextRoundButton.classList.toggle('hidden', !canContinueMatch);
  elements.startButton.textContent = matchComplete ? 'Begin New Match' : 'Begin Match';
}

function renderGame(game, options = {}) {
  state.game = game;
  if (elements.playerMarkDisplay) {
    elements.playerMarkDisplay.textContent = game?.playerSymbol || state.selectedSymbol;
  }
  if (game?.difficulty) {
    state.selectedDifficulty = game.difficulty;
    elements.difficultySelect.value = game.difficulty;
    if (elements.difficultyDescription) {
      elements.difficultyDescription.classList.toggle('hidden', game.difficulty !== 'maestro');
    }
  }
  syncSkillHints(game);
  const hasExplicitMaestroAbility = Object.prototype.hasOwnProperty.call(options, 'maestroAbility');
  const activeMaestroAbility = hasExplicitMaestroAbility ? options.maestroAbility : null;
  if (activeMaestroAbility) {
    state.maestroAbilityCells = activeMaestroAbility.affectedCells || [];
    state.maestroBoardEffect = activeMaestroAbility.effect;
  }
  const activePhrolovaSkill = options.phrolovaSkill ?? game?.phrolovaSkill ?? null;
  renderBoard(game);
  renderScore(game);
  renderSkills(game);
  renderTurn(game);
  renderControls(game);
  setPhrolovaSkillDisplay(activeMaestroAbility
    ? {
      name: `Maestro Ability — ${activeMaestroAbility.name}`,
    }
    : activePhrolovaSkill);

  if (options.animatePhrolovaSkill && activePhrolovaSkill) {
    applyPhrolovaBoardEffect(activePhrolovaSkill);
    playPhrolovaSkillSound(activePhrolovaSkill);
  }

  if (activeMaestroAbility) {
    window.clearTimeout(state.maestroEffectTimer);
    elements.board.classList.add(activeMaestroAbility.effect);
    state.maestroEffectTimer = window.setTimeout(() => {
      elements.board.classList.remove(activeMaestroAbility.effect);
    }, 950);
  }
  const maestroDialogHandled = activeMaestroAbility
    ? handlePhrolovaTurn({
      abilityName: activeMaestroAbility.name,
      abilityEffect: activeMaestroAbility.effect,
    })
    : false;

  if (options.systemMessage && !maestroDialogHandled && (!game || game.status === 'idle')) {
    setDialog(options.systemMessage);
    return;
  }

  if (!game || game.status === 'idle') {
    setPhrolovaAvatar('play');
    return;
  }

  if (game.status === 'playing') {
    setPhrolovaAvatar('play');
    if (options.phrolovaMoved && !maestroDialogHandled) {
      handlePhrolovaTurn();
    }
    return;
  }

  if (game.winner === 'player') {
    setPhrolovaAvatar('lose');
    if (!maestroDialogHandled) handlePhrolovaTurn({ endState: 'lose' });
    safePlay('win');
  } else if (game.winner === 'ai') {
    setPhrolovaAvatar('win');
    if (!maestroDialogHandled) handlePhrolovaTurn({ endState: 'win' });
    safePlay('lose');
  } else if (game.winner === 'draw') {
    setPhrolovaAvatar('draw');
    if (!maestroDialogHandled) handlePhrolovaTurn({ endState: 'draw' });
    safePlay('draw');
  }

  if (game.match?.isComplete) {
    showMatchModal(game.match.result);
  }
}

function showMatchModal(result) {
  const dialogTypeByResult = {
    player: 'lose',
    ai: 'win',
    draw: 'draw',
  };

  const titleByResult = {
    player: 'You conducted the finale.',
    ai: 'Phrolova owns the finale.',
    draw: 'The finale remains unresolved.',
  };

  elements.modalTitle.textContent = titleByResult[result] || 'The final note has fallen.';
  elements.modalText.textContent = getRandomDialog(dialogTypeByResult[result] || 'draw').text;
  elements.modal.classList.remove('hidden');
}

async function startMatch({ preserveMatch = false } = {}) {
  stopPhrolovaVoice();
  startBgmOnce();
  setPhrolovaAvatar('play');
  state.insightHintIndex = null;
  state.shieldHintIndex = null;
  const difficultySelect = document.getElementById('difficultySelect');
  const selectedDifficulty = difficultySelect?.value || state.selectedDifficulty;
  state.selectedDifficulty = selectedDifficulty;
  if (elements.difficultyDescription) {
    elements.difficultyDescription.classList.toggle('hidden', state.selectedDifficulty !== 'maestro');
  }
  const data = await apiRequest('/start', {
    method: 'POST',
    body: JSON.stringify({
      playerSymbol: state.selectedSymbol,
      difficulty: selectedDifficulty,
      matchMode: state.selectedMatchMode,
      preserveMatch,
    }),
  });
    renderGame(data.game, {
      phrolovaSkill: data.phrolovaSkill,
      maestroAbility: data.maestroAbility,
      animatePhrolovaSkill: Boolean(data.phrolovaSkill),
      systemMessage: data.systemMessage,
    });
}

async function handlePlayerMove(index) {
  if (state.aiThinking) return;

  safePlay('click');
  const previousGame = state.game;
  const pendingGame = previousGame
    ? {
      ...previousGame,
      board: [...previousGame.board],
      currentTurn: previousGame.aiSymbol,
      lastMove: { by: 'player', index },
    }
    : null;

  if (pendingGame && !pendingGame.board[index]) {
    pendingGame.board[index] = pendingGame.playerSymbol;
  }

  state.aiThinking = true;
  renderGame(pendingGame || state.game);
  await wait(650);

  try {
    const before = previousGame?.board?.filter(Boolean).length || 0;
    const data = await apiRequest('/move', {
      method: 'POST',
      body: JSON.stringify({ index }),
    });
    const after = data.game?.board?.filter(Boolean).length || before;

    if (after > before + 1 && data.game?.status === 'playing') {
      safePlay('ai');
    }

    const phrolovaSkill = data.phrolovaSkill;
    const shieldActivated = !phrolovaSkill && data.game?.status === 'playing' && data.game?.skills?.harmonyShield?.active;

    if (shieldActivated) safePlay('skill');
    state.aiThinking = false;
    renderGame(data.game, {
      phrolovaSkill,
      maestroAbility: data.maestroAbility,
      animatePhrolovaSkill: Boolean(phrolovaSkill),
      phrolovaMoved: data.aiMove !== null && data.aiMove !== undefined,
      systemMessage: data.systemMessage,
    });
  } catch (error) {
    state.aiThinking = false;
    renderGame(previousGame, { systemMessage: error.message });
  }
}

async function useInsightSkill() {
  try {
    const data = await apiRequest('/skill/insight', {
      method: 'POST',
      body: JSON.stringify({
        board: state.game?.board,
        playerSymbol: state.game?.playerSymbol,
        aiSymbol: state.game?.aiSymbol,
      }),
    });

    state.insightHintIndex = data.bestMoveIndex;
    safePlay('skill');
    renderGame(data.game, { systemMessage: data.systemMessage });
  } catch (error) {
    renderGame(state.game, { systemMessage: error.message });
  }
}

async function useUndoSkill() {
  try {
    const data = await apiRequest('/skill/undo', {
      method: 'POST',
      body: JSON.stringify({
        game: state.game,
        history: state.game?.history || [],
      }),
    });

    state.insightHintIndex = null;
    state.shieldHintIndex = null;
    safePlay('skill');
    renderGame(data.game, { systemMessage: data.systemMessage });
  } catch (error) {
    renderGame(state.game, { systemMessage: error.message });
  }
}

async function useHarmonyShieldSkill() {
  try {
    const data = await apiRequest('/skill/shield', {
      method: 'POST',
      body: JSON.stringify({
        use: true,
        board: state.game?.board,
        playerSymbol: state.game?.playerSymbol,
        aiSymbol: state.game?.aiSymbol,
      }),
    });

    state.insightHintIndex = null;
    safePlay('skill');
    renderGame(data.game, {
      phrolovaSkill: data.phrolovaSkill,
      maestroAbility: data.maestroAbility,
      animatePhrolovaSkill: Boolean(data.phrolovaSkill),
      phrolovaMoved: data.aiMove !== null && data.aiMove !== undefined,
      systemMessage: data.systemMessage,
    });
  } catch (error) {
    renderGame(state.game, { systemMessage: error.message });
  }
}

async function resetGame() {
  stopPhrolovaVoice();
  setPhrolovaAvatar('play');
  state.insightHintIndex = null;
  state.shieldHintIndex = null;
  const data = await apiRequest('/reset', { method: 'POST' });
  renderGame(data.game, { systemMessage: data.systemMessage });
}

async function syncDifficulty() {
  state.selectedDifficulty = elements.difficultySelect.value;
  if (elements.difficultyDescription) {
    elements.difficultyDescription.classList.toggle('hidden', state.selectedDifficulty !== 'maestro');
  }
  await apiRequest('/difficulty', {
    method: 'POST',
    body: JSON.stringify({ difficulty: state.selectedDifficulty }),
  });
}

async function syncMatchMode() {
  state.insightHintIndex = null;
  state.shieldHintIndex = null;
  await apiRequest('/match-mode', {
    method: 'POST',
    body: JSON.stringify({ mode: state.selectedMatchMode }),
  });
  const status = await apiRequest('/status');
  renderGame(status.game, { systemMessage: status.systemMessage });
}

function bindIntroFlow() {
  elements.startGameIntroBtn?.addEventListener('click', () => {
    playClickSfx();
    showScreen('modeSelectScreen');
    if (elements.multiplayerMessage) elements.multiplayerMessage.textContent = '';
  });

  elements.vsPhrolovaBtn?.addEventListener('click', () => {
    playClickSfx();
    showScreen('gameScreen');
    setDialog(BACKEND_UNAVAILABLE_MESSAGE);
    playPhrolovaWelcome();
  });

  elements.multiplayerBtn?.addEventListener('click', () => {
    playClickSfx();
    if (window.TacTicMultiplayer?.showSetup) {
      window.TacTicMultiplayer.showSetup();
      return;
    }
    if (elements.multiplayerMessage) elements.multiplayerMessage.textContent = 'Supabase is not configured yet.';
  });
}

function bindEvents() {
  elements.symbolButtons.forEach((button) => {
    button.addEventListener('click', () => {
      playClickSfx();
      state.selectedSymbol = button.dataset.symbol;
      if (elements.playerMarkDisplay) {
        elements.playerMarkDisplay.textContent = state.selectedSymbol;
      }
      elements.symbolButtons.forEach((item) => item.classList.toggle('active', item === button));
    });
  });

  elements.difficultySelect.addEventListener('change', async (event) => {
    playClickSfx();
    state.selectedDifficulty = event.target.value;
    if (elements.difficultyDescription) {
      elements.difficultyDescription.classList.toggle('hidden', state.selectedDifficulty !== 'maestro');
    }
    await syncDifficulty();
  });

  elements.matchModeSelect.addEventListener('change', async (event) => {
    playClickSfx();
    state.selectedMatchMode = Number(event.target.value);
    await syncMatchMode();
  });

  elements.startButton.addEventListener('click', () => {
    playClickSfx();
    startMatch({ preserveMatch: false });
  });
  elements.nextRoundButton.addEventListener('click', () => {
    playClickSfx();
    startMatch({ preserveMatch: true });
  });
  elements.resetButton.addEventListener('click', () => {
    playClickSfx();
    resetGame();
  });
  elements.insightSkillButton.addEventListener('click', () => {
    playClickSfx();
    useInsightSkill();
  });
  elements.undoSkillButton.addEventListener('click', () => {
    playClickSfx();
    useUndoSkill();
  });
  elements.useShieldButton.addEventListener('click', () => {
    playClickSfx();
    useHarmonyShieldSkill();
  });
  elements.modalCloseButton.addEventListener('click', () => {
    playClickSfx();
    elements.modal.classList.add('hidden');
  });

  elements.muteButton.addEventListener('click', () => {
    playClickSfx();
    state.muted = !state.muted;
    elements.muteButton.textContent = state.muted ? 'Sound Off' : 'Sound On';
    elements.muteButton.setAttribute('aria-pressed', String(state.muted));

    if (state.muted) {
      stopBackgroundMusic();
      stopPhrolovaVoice();
    } else {
      state.audioReady = true;
      playBackgroundMusic();
    }
  });

  elements.backToModeFromPhrolova?.addEventListener('click', () => {
    playClickSfx();
    stopModeAudio();
    showScreen('modeSelectScreen');
    if (elements.multiplayerMessage) elements.multiplayerMessage.textContent = '';
  });
}

async function init() {
  bindIntroFlow();
  bindEvents();
  stopAllBackgroundAudioElements();
  initBackgroundMusic();
  initPhrolovaVideo();
  setPhrolovaAvatar('play');
  renderBoard(null);
  renderScore(null);
  renderSkills(null);

  try {
    const data = await apiRequest('/status');
    renderGame(data.game, { systemMessage: data.systemMessage });
  } catch (error) {
    setDialog(BACKEND_UNAVAILABLE_MESSAGE);
  }
}

init();
