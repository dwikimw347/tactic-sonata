const scoreStore = require('../data/scoreStore');
const { checkWinner, evaluateBoard, findBestMove, getAvailableMoves } = require('../services/minimaxService');
const playerSkillService = require('../services/playerSkillService');
const {
  choosePhrolovaSkill,
  toPublicPhrolovaSkill,
} = require('../services/phrolovaSkillService');
const maestroAbilityService = require('../services/maestroAbilityService');

function apiResponse(success, message, data = {}) {
  return { success, message, data };
}

function normalizeSymbol(symbol) {
  return symbol === 'O' ? 'O' : 'X';
}

function oppositeSymbol(symbol) {
  return symbol === 'X' ? 'O' : 'X';
}

function getCurrentRound(match) {
  return Math.min(match.completedRounds + 1, match.mode);
}

function publicGameState(game) {
  if (!game) {
    return {
      status: 'idle',
      board: scoreStore.getInitialBoard(),
      score: scoreStore.getScore(),
      match: scoreStore.getMatch(),
      difficulty: scoreStore.getDifficulty(),
      matchMode: scoreStore.getMatchMode(),
      history: [],
      boardHistory: [],
      abilityUsage: {
        resonanceOverrideUsed: false,
        symphonyOfRebirthUsed: false,
      },
      temporaryEffects: {
        hecateShadow: null,
      },
      skills: playerSkillService.getSkillStatus(null),
      phrolovaSkill: null,
      maestroAbility: null,
    };
  }

  return {
    ...game,
    match: {
      ...game.match,
      currentRound: getCurrentRound(game.match),
    },
    score: scoreStore.getScore(),
    history: game.history || [],
    boardHistory: game.boardHistory || [],
    abilityUsage: game.abilityUsage || {},
    temporaryEffects: game.temporaryEffects || {},
    skills: playerSkillService.getSkillStatus(game),
    phrolovaSkill: toPublicPhrolovaSkill(game.lastPhrolovaSkill),
    maestroAbility: maestroAbilityService.toPublicMaestroAbility(game.lastMaestroAbility),
  };
}

function finalizeRound(game, result, winningPattern = []) {
  if (result !== 'draw') {
    const expectedSymbol = result === 'player' ? game.playerSymbol : game.aiSymbol;
    const boardWinner = checkWinner(game.board);
    const validWinner = boardWinner.winner === expectedSymbol
      && boardWinner.winningPattern.length === 3
      && boardWinner.winningPattern.every((index) => game.board[index] === expectedSymbol);

    if (!validWinner) {
      console.error('Invalid winner state prevented:', {
        board: game.board,
        winner: expectedSymbol,
        winningPattern,
      });
      game.status = 'playing';
      game.winner = null;
      game.winningPattern = [];
      return game;
    }
  }

  game.status = 'finished';
  game.winner = result;
  game.winningPattern = winningPattern;
  playerSkillService.clearHarmonyShield(game);

  scoreStore.incrementScore(result);
  game.match = scoreStore.recordMatchRound(result);
  scoreStore.setCurrentGame(game);

  return game;
}

function createSkillResult(skill, move, overrides = {}) {
  return {
    skill: skill.skill,
    dialogue: skill.dialogue,
    effect: skill.effect,
    strategy: skill.strategy,
    move,
    ...overrides,
  };
}

function tryNormalSkills(game) {
  const normalChoice = choosePhrolovaSkill({
    board: game.board,
    aiSymbol: game.aiSymbol,
    playerSymbol: game.playerSymbol,
    difficulty: 'impossible',
  });

  if (normalChoice.move !== null && !game.board[normalChoice.move]) {
    return normalChoice;
  }

  const fallbackMove = findBestMove(game.board, game.aiSymbol, game.playerSymbol);
  if (fallbackMove !== null && !game.board[fallbackMove]) {
    return {
      ...normalChoice,
      strategy: 'minimax-fallback',
      move: fallbackMove,
    };
  }

  const randomMove = getAvailableMoves(game.board)[0] ?? null;
  return createSkillResult({
    skill: 'Echo Manipulation',
    dialogue: 'Not every note follows logic... some are meant to deceive.',
    effect: 'phrolova-random',
    strategy: 'random',
  }, randomMove);
}

function avoidTemporaryShadowMove(game, choice) {
  const shadow = game.temporaryEffects?.hecateShadow;
  if (!shadow || choice?.move !== shadow.index) return choice;

  const alternatives = getAvailableMoves(game.board).filter((move) => move !== shadow.index);
  if (!alternatives.length) return choice;

  const restoredBoard = [...game.board];
  restoredBoard[shadow.index] = shadow.symbol;
  const bestMove = findBestMove(restoredBoard, game.aiSymbol, game.playerSymbol);
  const safeMove = alternatives.includes(bestMove)
    ? bestMove
    : [4, 0, 2, 6, 8, 1, 3, 5, 7].find((move) => alternatives.includes(move)) ?? alternatives[0];

  return {
    ...choice,
    move: safeMove,
    strategy: `${choice.strategy || 'move'}-avoid-shadow`,
  };
}

function applyOutcomeIfFinished(game) {
  const outcome = evaluateBoard(game.board);

  if (outcome.winner) {
    const winner = outcome.winner === game.playerSymbol ? 'player' : 'ai';
    return finalizeRound(game, winner, outcome.winningPattern);
  }

  if (outcome.isDraw) {
    return finalizeRound(game, 'draw');
  }

  return game;
}

function performAIMove(game) {
  maestroAbilityService.ensureMaestroState(game);
  let maestroAbility = null;

  if (game.difficulty === 'maestro') {
    maestroAbility = maestroAbilityService.tryMaestroAbilities(game);
    if (maestroAbility?.effect === 'resonance-override' || maestroAbility?.effect === 'symphony-rebirth') {
      game.lastMaestroAbility = maestroAbility;
      applyOutcomeIfFinished(game);
      if (game.status === 'playing') {
        game.currentTurn = game.playerSymbol;
        playerSkillService.armHarmonyShield(game);
      }
      return {
        skill: maestroAbility.name,
        dialogue: maestroAbility.dialogue,
        effect: maestroAbility.effect,
        strategy: maestroAbility.reason || 'maestro-override',
        move: maestroAbility.move ?? maestroAbility.affectedCells?.[0] ?? null,
        maestroAbility,
      };
    }
  }

  let effectiveChoice;
  if (game.difficulty === 'maestro') {
    const forcedThreatMove = maestroAbilityService.createThreatForPlayer(game);
    if (forcedThreatMove !== null) {
      effectiveChoice = {
        skill: 'Echo Manipulation',
        dialogue: 'Not every note follows logic... some are meant to deceive.',
        effect: 'phrolova-random',
        strategy: 'maestro-force-threat',
        move: forcedThreatMove,
      };
    } else {
      effectiveChoice = tryNormalSkills(game);
    }
  } else {
    effectiveChoice = choosePhrolovaSkill({
      board: game.board,
      aiSymbol: game.aiSymbol,
      playerSymbol: game.playerSymbol,
      difficulty: game.difficulty,
    });
  }

  if (maestroAbility?.effect === 'hecate-shadow') {
    effectiveChoice = {
      ...effectiveChoice,
      skill: maestroAbility.name,
      dialogue: maestroAbility.dialogue,
      effect: maestroAbility.effect,
      strategy: `maestro-${maestroAbility.reason || 'shadow'}`,
    };
    effectiveChoice = avoidTemporaryShadowMove(game, effectiveChoice);
  }

  if (!effectiveChoice || effectiveChoice.move === null || game.board[effectiveChoice.move]) {
    const fallbackMove = findBestMove(game.board, game.aiSymbol, game.playerSymbol);
    effectiveChoice = {
      ...(effectiveChoice || {}),
      skill: effectiveChoice?.skill || 'Symphony Prediction',
      dialogue: effectiveChoice?.dialogue || 'Every move you make... I have already heard its echo.',
      effect: effectiveChoice?.effect || 'phrolova-prediction',
      strategy: 'minimax-fallback',
      move: fallbackMove,
    };
  }
  const move = effectiveChoice.move;

  if (move === null || game.board[move]) {
    maestroAbilityService.restoreHecatesShadow(game);
    game.lastPhrolovaSkill = effectiveChoice;
    game.lastMaestroAbility = maestroAbility;
    return { ...effectiveChoice, maestroAbility };
  }

  maestroAbilityService.pushBoardHistory(game);
  game.board[move] = game.aiSymbol;
  const restoredShadow = maestroAbilityService.restoreHecatesShadow(game);
  const affectedCells = [
    ...(maestroAbility?.affectedCells || []),
    ...(restoredShadow ? [restoredShadow.index] : []),
  ];
  if (maestroAbility && affectedCells.length) {
    maestroAbility.affectedCells = [...new Set(affectedCells)];
  }
  game.lastPhrolovaSkill = effectiveChoice;
  game.lastMaestroAbility = maestroAbility;
  game.lastMove = {
    by: 'ai',
    index: move,
    strategy: effectiveChoice.strategy,
    skill: maestroAbility?.name || effectiveChoice.skill,
    effect: maestroAbility?.effect || effectiveChoice.effect,
  };
  game.history.push({
    by: 'ai',
    symbol: game.aiSymbol,
    index: move,
    strategy: effectiveChoice.strategy,
    skill: maestroAbility?.name || effectiveChoice.skill,
    effect: maestroAbility?.effect || effectiveChoice.effect,
  });

  applyOutcomeIfFinished(game);

  if (game.status === 'playing') {
    game.currentTurn = game.playerSymbol;
    playerSkillService.armHarmonyShield(game);
  }

  return { ...effectiveChoice, move, maestroAbility };
}

function createGame({ playerSymbol = 'X', difficulty, matchMode, preserveMatch = false } = {}) {
  const selectedSymbol = normalizeSymbol(playerSymbol);
  const selectedDifficulty = scoreStore.setDifficulty(difficulty);
  const requestedMatchMode = Number(matchMode) === 5 ? 5 : Number(matchMode) === 3 ? 3 : scoreStore.getMatchMode();
  const currentMatchMode = scoreStore.getMatchMode();
  const selectedMatchMode = requestedMatchMode !== currentMatchMode
    ? scoreStore.setMatchMode(requestedMatchMode)
    : currentMatchMode;

  const existingMatch = scoreStore.getMatch();
  const shouldResetMatch = !preserveMatch || existingMatch.isComplete || existingMatch.mode !== selectedMatchMode;
  const match = shouldResetMatch ? scoreStore.resetMatch(selectedMatchMode) : existingMatch;

  const game = {
    board: scoreStore.getInitialBoard(),
    playerSymbol: selectedSymbol,
    aiSymbol: oppositeSymbol(selectedSymbol),
    currentTurn: 'X',
    status: 'playing',
    winner: null,
    winningPattern: [],
    difficulty: selectedDifficulty,
    matchMode: selectedMatchMode,
    match,
    skills: playerSkillService.createSkillState(),
    history: [],
    boardHistory: [],
    abilityUsage: {
      resonanceOverrideUsed: false,
      symphonyOfRebirthUsed: Boolean(match.abilityUsage?.symphonyOfRebirthUsed),
    },
    temporaryEffects: {
      hecateShadow: null,
    },
    maestro: {
      resonanceUsed: false,
      symphonyUsed: Boolean(match.abilityUsage?.symphonyOfRebirthUsed),
      shadowCount: 0,
      shadowUsedCount: 0,
    },
    lastPhrolovaSkill: null,
    lastMaestroAbility: null,
    lastMove: null,
    createdAt: new Date().toISOString(),
  };

  if (game.aiSymbol === 'X') {
    performAIMove(game);
  }

  scoreStore.setCurrentGame(game);
  return game;
}

function getStatus(req, res) {
  res.json(apiResponse(true, 'The curtain is lifted.', { game: publicGameState(scoreStore.getCurrentGame()) }));
}

function startGame(req, res) {
  const game = createGame(req.body || {});
  console.log('[START API] req.body.difficulty:', req.body?.difficulty);
  console.log('[START API] stored difficulty:', game.difficulty);
  res.json(apiResponse(true, 'Let the stage be set.', {
    game: publicGameState(game),
    phrolovaSkill: toPublicPhrolovaSkill(game.lastPhrolovaSkill),
    maestroAbility: maestroAbilityService.toPublicMaestroAbility(game.lastMaestroAbility),
  }));
}

function makeMove(req, res) {
  const game = scoreStore.getCurrentGame();
  const index = Number(req.body?.index);
  console.log('[MOVE API] active difficulty:', game?.difficulty);

  if (!game || game.status !== 'playing') {
    return res.status(400).json(apiResponse(false, 'No active performance awaits your move.'));
  }

  if (game.currentTurn !== game.playerSymbol) {
    return res.status(409).json(apiResponse(false, 'The baton is not yet yours.'));
  }

  if (!Number.isInteger(index) || index < 0 || index > 8) {
    return res.status(400).json(apiResponse(false, 'That square is beyond the stage.'));
  }

  if (game.board[index]) {
    return res.status(409).json(apiResponse(false, 'That note has already been played.'));
  }

  maestroAbilityService.ensureMaestroState(game);
  maestroAbilityService.pushBoardHistory(game);
  game.board[index] = game.playerSymbol;
  game.lastMove = {
    by: 'player',
    index,
  };
  game.history.push({
    by: 'player',
    symbol: game.playerSymbol,
    index,
  });
  playerSkillService.clearHarmonyShield(game);
  if (game.skills?.insight) {
    game.skills.insight.lastSuggestedMove = null;
  }
  game.currentTurn = game.aiSymbol;

  let maestroAbility = null;
  const playerOutcome = evaluateBoard(game.board);
  const playerEndedRound = Boolean(playerOutcome.winner || playerOutcome.isDraw);
  if (game.difficulty === 'maestro' && playerEndedRound && maestroAbilityService.canUseSymphonyOfRebirth(game, playerOutcome)) {
    maestroAbility = maestroAbilityService.applySymphonyOfRebirth(game);
    game.lastMaestroAbility = maestroAbility;
    applyOutcomeIfFinished(game);
  } else {
    applyOutcomeIfFinished(game);
  }

  let phrolovaSkill = null;
  if (game.status === 'playing' && maestroAbility?.effect !== 'symphony-rebirth') {
    phrolovaSkill = performAIMove(game);
    maestroAbility = phrolovaSkill?.maestroAbility || maestroAbility;
  }

  scoreStore.setCurrentGame(game);
  return res.json(apiResponse(true, 'The phrase continues.', {
    game: publicGameState(game),
    board: game.board,
    currentTurn: game.currentTurn,
    winner: game.winner,
    aiMove: phrolovaSkill?.move ?? maestroAbility?.move ?? null,
    phrolovaSkill: toPublicPhrolovaSkill(phrolovaSkill),
    maestroAbility: maestroAbilityService.toPublicMaestroAbility(maestroAbility),
  }));
}

function resetGame(req, res) {
  const currentDifficulty = scoreStore.getDifficulty();
  scoreStore.resetAll();
  scoreStore.setDifficulty(currentDifficulty);
  res.json(apiResponse(true, 'The hall falls silent, ready for another overture.', { game: publicGameState(null) }));
}

function getScore(req, res) {
  res.json(apiResponse(true, 'The ledger of applause and lament.', {
    score: scoreStore.getScore(),
    match: scoreStore.getMatch(),
  }));
}

function setMatchMode(req, res) {
  const mode = scoreStore.setMatchMode(req.body?.mode);
  scoreStore.setCurrentGame(null);
  res.json(apiResponse(true, `The concert is now Best of ${mode}.`, {
    matchMode: mode,
    match: scoreStore.getMatch(),
  }));
}

function setDifficulty(req, res) {
  const difficulty = scoreStore.setDifficulty(req.body?.difficulty);
  res.json(apiResponse(true, `Phrolova now performs at ${difficulty} tempo.`, { difficulty }));
}

function getSkills(req, res) {
  const game = scoreStore.getCurrentGame();
  res.json(apiResponse(true, 'The repertoire of mortal tricks.', {
    skills: playerSkillService.getSkillStatus(game),
    history: game?.history || [],
  }));
}

function useInsight(req, res) {
  const game = scoreStore.getCurrentGame();

  if (!game || game.status !== 'playing') {
    return res.status(400).json(apiResponse(false, 'Insight cannot enter an empty hall.'));
  }

  const result = playerSkillService.useInsight(game);
  if (!result.ok) {
    return res.status(result.statusCode).json(apiResponse(false, result.message, result.data || {}));
  }

  scoreStore.setCurrentGame(game);
  return res.json(apiResponse(true, result.message, {
    ...result.data,
    game: publicGameState(game),
  }));
}

function useUndo(req, res) {
  const game = scoreStore.getCurrentGame();

  if (!game) {
    return res.status(400).json(apiResponse(false, 'There is no melody to rewind.'));
  }

  const result = playerSkillService.undoLastPlayerTurn(game);
  if (!result.ok) {
    return res.status(result.statusCode).json(apiResponse(false, result.message, result.data || {}));
  }

  scoreStore.setCurrentGame(result.data.game);
  return res.json(apiResponse(true, result.message, {
    game: publicGameState(result.data.game),
    removedMoves: result.data.removedMoves,
    skills: result.data.skills,
  }));
}

function useShield(req, res) {
  const game = scoreStore.getCurrentGame();

  if (!game || game.status !== 'playing') {
    return res.status(400).json(apiResponse(false, 'Harmony Shield cannot guard a silent stage.'));
  }

  if (req.body?.use === true) {
    const result = playerSkillService.useHarmonyShield(game);
    if (!result.ok) {
      return res.status(result.statusCode).json(apiResponse(false, result.message, result.data || {}));
    }

    applyOutcomeIfFinished(game);

    let phrolovaSkill = null;
    let maestroAbility = null;
    if (game.status === 'playing') {
      phrolovaSkill = performAIMove(game);
      maestroAbility = phrolovaSkill?.maestroAbility || null;
    }

    scoreStore.setCurrentGame(game);
    return res.json(apiResponse(true, result.message, {
      isThreatDetected: result.data.isThreatDetected,
      blockMoveIndex: result.data.blockMoveIndex,
      skills: playerSkillService.getSkillStatus(game),
      game: publicGameState(game),
      aiMove: phrolovaSkill?.move ?? null,
      phrolovaSkill: toPublicPhrolovaSkill(phrolovaSkill),
      maestroAbility: maestroAbilityService.toPublicMaestroAbility(maestroAbility),
    }));
  }

  const threat = playerSkillService.armHarmonyShield(game);
  scoreStore.setCurrentGame(game);

  return res.json(apiResponse(true, threat.isThreatDetected
    ? 'You resist the inevitable... admirable, yet fragile.'
    : 'No fatal phrase needs harmony yet.', {
    isThreatDetected: threat.isThreatDetected,
    blockMoveIndex: threat.blockMoveIndex,
    canAutoBlock: threat.canAutoBlock,
    skills: playerSkillService.getSkillStatus(game),
    game: publicGameState(game),
  }));
}

module.exports = {
  createGame,
  getStatus,
  startGame,
  makeMove,
  resetGame,
  getScore,
  setMatchMode,
  setDifficulty,
  getSkills,
  useInsight,
  useUndo,
  useShield,
};
