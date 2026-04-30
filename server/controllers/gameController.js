const scoreStore = require('../data/scoreStore');
const { evaluateBoard, findBestMove } = require('../services/minimaxService');
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
  game.status = 'finished';
  game.winner = result;
  game.winningPattern = winningPattern;
  playerSkillService.clearHarmonyShield(game);

  scoreStore.incrementScore(result);
  game.match = scoreStore.recordMatchRound(result);
  scoreStore.setCurrentGame(game);

  return game;
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
    if (maestroAbilityService.canUseHecatesShadow(game)) {
      maestroAbility = maestroAbilityService.applyHecatesShadow(game);
    } else if (maestroAbilityService.canUseResonanceOverride(game)) {
      maestroAbility = maestroAbilityService.applyResonanceOverride(game);
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
    } else if (maestroAbilityService.canUseSymphonyOfRebirth(game)) {
      maestroAbility = maestroAbilityService.applySymphonyOfRebirth(game);
      game.lastMaestroAbility = maestroAbility;
      applyOutcomeIfFinished(game);
      return {
        skill: maestroAbility.name,
        dialogue: maestroAbility.dialogue,
        effect: maestroAbility.effect,
        strategy: 'symphony-rebirth',
        move: maestroAbility.move ?? null,
        maestroAbility,
      };
    }
  }

  const aiChoice = choosePhrolovaSkill({
    board: game.board,
    aiSymbol: game.aiSymbol,
    playerSymbol: game.playerSymbol,
    difficulty: game.difficulty === 'maestro' ? 'impossible' : game.difficulty,
  });

  let effectiveChoice = aiChoice;
  if (game.difficulty === 'maestro' && !maestroAbility) {
    const forcedThreatMove = maestroAbilityService.createThreatForPlayer(game);
    if (forcedThreatMove !== null) {
      effectiveChoice = {
        skill: 'Echo Manipulation',
        dialogue: 'Not every note follows logic... some are meant to deceive.',
        effect: 'phrolova-random',
        strategy: 'maestro-force-threat',
        move: forcedThreatMove,
      };
    }
  } else if (maestroAbility) {
    effectiveChoice = {
      ...aiChoice,
      skill: maestroAbility.name,
      dialogue: maestroAbility.dialogue,
      effect: maestroAbility.effect,
      strategy: `maestro-${maestroAbility.reason || 'shadow'}`,
    };
  }

  if (effectiveChoice.move === null || game.board[effectiveChoice.move]) {
    const fallbackMove = findBestMove(game.board, game.aiSymbol, game.playerSymbol);
    effectiveChoice = {
      ...effectiveChoice,
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
