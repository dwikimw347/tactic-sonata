const {
  WIN_PATTERNS,
  evaluateBoard,
  findBestMove,
  getAvailableMoves,
} = require('./minimaxService');
const { findBlockingMove, findWinningMove } = require('./phrolovaSkillService');

const MAESTRO_DIFFICULTY = 'maestro';

const ABILITIES = Object.freeze({
  resonance: {
    name: 'Resonance Override',
    dialogue: 'Thy mark now singeth in mine own frequency.',
    effect: 'resonance-override',
  },
  hecate: {
    name: 'Hecate’s Shadow',
    dialogue: 'Hecate casteth her veil; thy melody falleth into shadow.',
    effect: 'hecate-shadow',
  },
  rebirth: {
    name: 'Symphony of Rebirth',
    dialogue: 'Let the movement begin anew; death is but another refrain.',
    effect: 'symphony-rebirth',
  },
});

function isMaestro(gameState) {
  return gameState?.difficulty === MAESTRO_DIFFICULTY;
}

function ensureMaestroState(gameState) {
  if (!gameState.abilityUsage) {
    gameState.abilityUsage = {};
  }

  gameState.abilityUsage.resonanceOverrideUsed = Boolean(gameState.abilityUsage.resonanceOverrideUsed);
  gameState.abilityUsage.symphonyOfRebirthUsed = Boolean(
    gameState.abilityUsage.symphonyOfRebirthUsed || gameState.match?.abilityUsage?.symphonyOfRebirthUsed,
  );

  if (gameState.match) {
    gameState.match.abilityUsage = {
      ...(gameState.match.abilityUsage || {}),
      symphonyOfRebirthUsed: gameState.abilityUsage.symphonyOfRebirthUsed,
    };
  }

  if (!gameState.temporaryEffects) {
    gameState.temporaryEffects = {};
  }

  if (!Array.isArray(gameState.boardHistory)) {
    gameState.boardHistory = [];
  }

  return gameState;
}

function pushBoardHistory(gameState) {
  ensureMaestroState(gameState);
  gameState.boardHistory.push([...gameState.board]);
}

function findPlayerThreat(board, playerSymbol) {
  for (const pattern of WIN_PATTERNS) {
    const cells = pattern.map((index) => board[index]);
    const playerCells = pattern.filter((index) => board[index] === playerSymbol);
    const emptyCells = pattern.filter((index) => !board[index]);

    if (playerCells.length === 2 && emptyCells.length === 1 && cells.includes(null)) {
      return {
        pattern,
        playerCells,
        emptyCell: emptyCells[0],
      };
    }
  }

  return null;
}

function createAbilityResult(type, affectedCells = [], extra = {}) {
  return {
    ...ABILITIES[type],
    ability: ABILITIES[type].name,
    affectedCells,
    ...extra,
  };
}

function canUseResonanceOverride(gameState) {
  ensureMaestroState(gameState);
  if (!isMaestro(gameState) || gameState.abilityUsage.resonanceOverrideUsed) return false;
  return Boolean(getResonanceOverrideTarget(gameState));
}

function getResonanceOverrideTarget(gameState) {
  const { board, aiSymbol, playerSymbol } = gameState;
  const playerCells = board
    .map((cell, index) => (cell === playerSymbol ? index : null))
    .filter((index) => index !== null);

  for (const index of playerCells) {
    const nextBoard = [...board];
    nextBoard[index] = aiSymbol;
    if (evaluateBoard(nextBoard).winner === aiSymbol) {
      return { index, reason: 'winning-conversion' };
    }
  }

  const threat = findPlayerThreat(board, playerSymbol);
  if (threat) {
    return { index: threat.playerCells[0], reason: 'threat-denial', pattern: threat.pattern };
  }

  return null;
}

function applyResonanceOverride(gameState) {
  ensureMaestroState(gameState);
  const target = getResonanceOverrideTarget(gameState);
  if (!target || gameState.board[target.index] !== gameState.playerSymbol) return null;

  pushBoardHistory(gameState);
  gameState.board[target.index] = gameState.aiSymbol;
  gameState.abilityUsage.resonanceOverrideUsed = true;
  gameState.history.push({
    by: 'ai',
    symbol: gameState.aiSymbol,
    index: target.index,
    skill: ABILITIES.resonance.name,
    effect: ABILITIES.resonance.effect,
    converted: true,
  });

  return createAbilityResult('resonance', [target.index], { reason: target.reason });
}

function canUseHecatesShadow(gameState) {
  if (!isMaestro(gameState)) return false;
  return Boolean(findPlayerThreat(gameState.board, gameState.playerSymbol));
}

function applyHecatesShadow(gameState) {
  ensureMaestroState(gameState);
  const threat = findPlayerThreat(gameState.board, gameState.playerSymbol);
  if (!threat) return null;

  const shadowCell = threat.playerCells[0];
  pushBoardHistory(gameState);
  gameState.board[shadowCell] = null;
  gameState.temporaryEffects.hecateShadow = {
    index: shadowCell,
    symbol: gameState.playerSymbol,
    pattern: threat.pattern,
  };

  return createAbilityResult('hecate', [shadowCell, threat.emptyCell], {
    shadowCell,
    threatCell: threat.emptyCell,
  });
}

function restoreHecatesShadow(gameState) {
  const shadow = gameState?.temporaryEffects?.hecateShadow;
  if (!shadow) return null;

  if (!gameState.board[shadow.index]) {
    gameState.board[shadow.index] = shadow.symbol;
  }

  gameState.temporaryEffects.hecateShadow = null;
  return shadow;
}

function canUseSymphonyOfRebirth(gameState, outcome = evaluateBoard(gameState.board)) {
  ensureMaestroState(gameState);
  if (!isMaestro(gameState) || gameState.abilityUsage.symphonyOfRebirthUsed) return false;
  if (gameState.boardHistory.length < 3) return false;
  if (outcome.winner === gameState.playerSymbol || outcome.isDraw) return true;

  const blockingMove = findBlockingMove(gameState.board, gameState.playerSymbol);
  const winningMove = findWinningMove(gameState.board, gameState.aiSymbol);
  return blockingMove === null && winningMove === null && getAvailableMoves(gameState.board).length <= 2;
}

function applySymphonyOfRebirth(gameState) {
  ensureMaestroState(gameState);
  const rollbackIndex = Math.max(0, gameState.boardHistory.length - 3);
  const rollbackBoard = gameState.boardHistory[rollbackIndex];
  if (!rollbackBoard) return null;

  gameState.board = [...rollbackBoard];
  gameState.boardHistory = gameState.boardHistory.slice(0, rollbackIndex + 1);
  gameState.winner = null;
  gameState.winningPattern = [];
  gameState.status = 'playing';
  gameState.temporaryEffects.hecateShadow = null;
  gameState.abilityUsage.symphonyOfRebirthUsed = true;
  if (gameState.match) {
    gameState.match.abilityUsage = {
      ...(gameState.match.abilityUsage || {}),
      symphonyOfRebirthUsed: true,
    };
  }

  let bonusMove = 4;
  if (gameState.board[bonusMove]) {
    bonusMove = findBestMove(gameState.board, gameState.aiSymbol, gameState.playerSymbol);
  }

  if (bonusMove !== null && !gameState.board[bonusMove]) {
    gameState.board[bonusMove] = gameState.aiSymbol;
    gameState.history.push({
      by: 'ai',
      symbol: gameState.aiSymbol,
      index: bonusMove,
      skill: ABILITIES.rebirth.name,
      effect: ABILITIES.rebirth.effect,
      bonus: true,
    });
  }

  gameState.currentTurn = gameState.playerSymbol;
  return createAbilityResult('rebirth', bonusMove !== null ? [bonusMove] : [], {
    move: bonusMove,
    rollbackIndex,
  });
}

function toPublicMaestroAbility(abilityResult) {
  if (!abilityResult) return null;

  return {
    name: abilityResult.name || abilityResult.ability,
    dialogue: abilityResult.dialogue,
    effect: abilityResult.effect,
    affectedCells: abilityResult.affectedCells || [],
    move: abilityResult.move ?? null,
  };
}

module.exports = {
  MAESTRO_DIFFICULTY,
  canUseHecatesShadow,
  applyHecatesShadow,
  restoreHecatesShadow,
  canUseResonanceOverride,
  applyResonanceOverride,
  canUseSymphonyOfRebirth,
  applySymphonyOfRebirth,
  ensureMaestroState,
  pushBoardHistory,
  toPublicMaestroAbility,
};
