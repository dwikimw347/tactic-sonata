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
    dialogue: 'Hecate standeth at the crossroads of fate...',
    effect: 'hecate-shadow',
  },
  rebirth: {
    name: 'Symphony of Rebirth',
    dialogue: 'Death is but prelude... let the melody be reborn.',
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

  gameState.abilityUsage.resonanceOverrideUsed = false;
  gameState.abilityUsage.symphonyOfRebirthUsed = false;

  if (gameState.match) {
    gameState.match.abilityUsage = {
      ...(gameState.match.abilityUsage || {}),
      symphonyOfRebirthUsed: false,
    };
  }

  if (!gameState.temporaryEffects) {
    gameState.temporaryEffects = {};
  }

  if (!Array.isArray(gameState.boardHistory)) {
    gameState.boardHistory = [];
  }

  if (!gameState.maestro) {
    gameState.maestro = {};
  }
  gameState.maestro.shadowCount = Number.isInteger(gameState.maestro.shadowCount)
    ? gameState.maestro.shadowCount
    : 0;

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

function getLineProfile(board, pattern, symbol) {
  const symbolCells = pattern.filter((index) => board[index] === symbol);
  const emptyCells = pattern.filter((index) => !board[index]);
  const blocked = pattern.some((index) => board[index] && board[index] !== symbol);
  return { pattern, symbolCells, emptyCells, blocked };
}

function countOpenThreats(board, symbol) {
  return WIN_PATTERNS.reduce((count, pattern) => {
    const profile = getLineProfile(board, pattern, symbol);
    return count + (profile.symbolCells.length === 2 && profile.emptyCells.length === 1 ? 1 : 0);
  }, 0);
}

function isLossImminent(board, playerSymbol) {
  if (findPlayerThreat(board, playerSymbol)) return true;

  return getAvailableMoves(board).some((move) => {
    const nextBoard = [...board];
    nextBoard[move] = playerSymbol;
    return countOpenThreats(nextBoard, playerSymbol) >= 2;
  });
}

function hasWinningPath(board, aiSymbol) {
  const opponentSymbol = aiSymbol === 'X' ? 'O' : 'X';
  return WIN_PATTERNS.some((pattern) => {
    const hasEmptyCell = pattern.some((index) => !board[index]);
    const isNotBlocked = pattern.every((index) => board[index] !== opponentSymbol);
    return hasEmptyCell && isNotBlocked;
  });
}

function isDrawImminent(board, aiSymbol) {
  const outcome = evaluateBoard(board);
  if (outcome.winner) return false;

  const filledCells = board.filter(Boolean).length;
  return filledCells >= 7 || !hasWinningPath(board, aiSymbol);
}

function findHecateShadowTarget(gameState) {
  const { board, playerSymbol } = gameState;
  const profiles = WIN_PATTERNS.map((pattern) => getLineProfile(board, pattern, playerSymbol));
  const completedLine = profiles.find((profile) => profile.symbolCells.length === 3);
  if (completedLine) {
    return {
      pattern: completedLine.pattern,
      playerCells: completedLine.symbolCells,
      emptyCell: completedLine.symbolCells[0],
      reason: 'completed-line',
      mustOccupyShadow: true,
    };
  }

  const directThreat = profiles.find((profile) => profile.symbolCells.length === 2 && profile.emptyCells.length === 1);
  if (directThreat) {
    return {
      pattern: directThreat.pattern,
      playerCells: directThreat.symbolCells,
      emptyCell: directThreat.emptyCells[0],
      reason: 'direct-threat',
    };
  }

  for (const index of getAvailableMoves(board)) {
    const nextBoard = [...board];
    nextBoard[index] = playerSymbol;
    if (countOpenThreats(nextBoard, playerSymbol) >= 2) {
      const forkLine = profiles.find((profile) => !profile.blocked && profile.symbolCells.length >= 1 && profile.pattern.includes(index));
      if (forkLine) {
        return {
          pattern: forkLine.pattern,
          playerCells: forkLine.symbolCells,
          emptyCell: index,
          reason: 'fork-potential',
        };
      }
    }
  }

  const developingLine = profiles.find((profile) => !profile.blocked && profile.symbolCells.length === 1 && profile.emptyCells.length === 2);
  if (developingLine) {
    return {
      pattern: developingLine.pattern,
      playerCells: developingLine.symbolCells,
      emptyCell: developingLine.emptyCells[0],
      reason: 'developing-line',
    };
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
  if (!isMaestro(gameState)) return false;
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

  for (const index of playerCells) {
    const nextBoard = [...board];
    nextBoard[index] = aiSymbol;
    if (countOpenThreats(nextBoard, aiSymbol) >= 2) {
      return { index, reason: 'fork-creation' };
    }
  }

  const threat = findPlayerThreat(board, playerSymbol);
  if (threat) {
    return { index: threat.playerCells[0], reason: 'threat-denial', pattern: threat.pattern };
  }

  if (isDrawImminent(board, aiSymbol) || !hasWinningPath(board, aiSymbol)) {
    let bestTarget = null;
    let bestScore = -Infinity;

    for (const index of playerCells) {
      const nextBoard = [...board];
      nextBoard[index] = aiSymbol;
      const outcome = evaluateBoard(nextBoard);
      const score = (outcome.winner === aiSymbol ? 100 : 0)
        + countOpenThreats(nextBoard, aiSymbol) * 8
        + (hasWinningPath(nextBoard, aiSymbol) ? 4 : -12);

      if (score > bestScore) {
        bestScore = score;
        bestTarget = index;
      }
    }

    if (bestTarget !== null) {
      return { index: bestTarget, reason: 'anti-draw-conversion' };
    }
  }

  return null;
}

function applyResonanceOverride(gameState) {
  ensureMaestroState(gameState);
  const target = getResonanceOverrideTarget(gameState);
  if (!target || gameState.board[target.index] !== gameState.playerSymbol) return null;

  pushBoardHistory(gameState);
  gameState.board[target.index] = gameState.aiSymbol;
  gameState.abilityUsage.resonanceOverrideUsed = false;
  gameState.history.push({
    by: 'ai',
    symbol: gameState.aiSymbol,
    index: target.index,
    skill: ABILITIES.resonance.name,
    effect: ABILITIES.resonance.effect,
    converted: true,
  });

  return createAbilityResult('resonance', [target.index], {
    dialogue: 'With a silent wave of my baton, I attune the frequencies of this grid.',
    reason: target.reason,
  });
}

function canUseHecatesShadow(gameState) {
  ensureMaestroState(gameState);
  if (!isMaestro(gameState)) return false;
  if (gameState.temporaryEffects?.hecateShadow) return false;
  const target = findHecateShadowTarget(gameState);
  if (!target) return false;
  return Boolean(target);
}

function applyHecatesShadow(gameState) {
  ensureMaestroState(gameState);
  const threat = findHecateShadowTarget(gameState);
  if (!threat) return null;

  const shadowCell = threat.playerCells[0];
  pushBoardHistory(gameState);
  gameState.board[shadowCell] = null;
  gameState.temporaryEffects.hecateShadow = {
    index: shadowCell,
    symbol: gameState.playerSymbol,
    pattern: threat.pattern,
    reason: threat.reason,
    mustOccupy: Boolean(threat.mustOccupyShadow),
  };
  gameState.maestro.shadowCount += 1;

  return createAbilityResult('hecate', [shadowCell, threat.emptyCell], {
    shadowCell,
    threatCell: threat.emptyCell,
    reason: threat.reason,
    mustOccupyShadow: Boolean(threat.mustOccupyShadow),
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
  if (!isMaestro(gameState)) return false;
  if (gameState.boardHistory.length < 1) return false;
  if (outcome.winner === gameState.playerSymbol || outcome.isDraw) return true;
  if (findPlayerThreat(gameState.board, gameState.playerSymbol)) return true;
  if (isLossImminent(gameState.board, gameState.playerSymbol)) return true;
  if (isDrawImminent(gameState.board, gameState.aiSymbol)) return true;
  if (!hasWinningPath(gameState.board, gameState.aiSymbol)) return true;

  const blockingMove = findBlockingMove(gameState.board, gameState.playerSymbol);
  const winningMove = findWinningMove(gameState.board, gameState.aiSymbol);
  const moveCount = gameState.board.filter(Boolean).length;
  if (gameState.maestro.shadowCount > 0 && moveCount >= 4) return true;
  return blockingMove === null && winningMove === null && getAvailableMoves(gameState.board).length <= 4;
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
  gameState.abilityUsage.symphonyOfRebirthUsed = false;
  if (gameState.match) {
    gameState.match.abilityUsage = {
      ...(gameState.match.abilityUsage || {}),
      symphonyOfRebirthUsed: false,
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

function chooseMaestroBaitMove(gameState) {
  ensureMaestroState(gameState);
  const moves = getAvailableMoves(gameState.board);
  if (!moves.length) return null;

  const winningMove = findWinningMove(gameState.board, gameState.aiSymbol);
  if (winningMove !== null) {
    return winningMove;
  }

  const blockingMove = findBlockingMove(gameState.board, gameState.playerSymbol);
  if (blockingMove !== null) {
    const baitMove = moves.find((move) => move !== blockingMove);
    if (baitMove !== undefined) return baitMove;
  }

  const preferred = [4, 0, 2, 6, 8, 1, 3, 5, 7].find((index) => moves.includes(index));
  return preferred ?? findBestMove(gameState.board, gameState.aiSymbol, gameState.playerSymbol);
}

function createThreatForPlayer(gameState) {
  ensureMaestroState(gameState);
  const moves = getAvailableMoves(gameState.board);
  if (!isMaestro(gameState) || moves.length === 0) return null;

  const playerHasMark = gameState.board.some((cell) => cell === gameState.playerSymbol);
  if (!playerHasMark) return null;

  const blockingMove = findBlockingMove(gameState.board, gameState.playerSymbol);
  if (blockingMove !== null) {
    const nonBlockingMove = moves.find((move) => move !== blockingMove);
    if (nonBlockingMove !== undefined) return nonBlockingMove;
  }

  const bestMove = findBestMove(gameState.board, gameState.aiSymbol, gameState.playerSymbol);
  const baitMove = [1, 3, 5, 7, 0, 2, 6, 8, 4].find((index) => moves.includes(index) && index !== bestMove);
  return baitMove ?? moves[0];
}

function tryMaestroAbilities(gameState) {
  ensureMaestroState(gameState);
  if (!isMaestro(gameState)) return null;

  const outcome = evaluateBoard(gameState.board);
  if (outcome.winner === gameState.playerSymbol || outcome.isDraw) {
    const rebirth = applySymphonyOfRebirth(gameState);
    if (rebirth) return rebirth;

    const shadow = applyHecatesShadow(gameState);
    if (shadow) return shadow;

    const resonance = applyResonanceOverride(gameState);
    if (resonance) return resonance;
  }

  if (isLossImminent(gameState.board, gameState.playerSymbol)) {
    if (canUseHecatesShadow(gameState)) {
      const shadow = applyHecatesShadow(gameState);
      if (shadow) return shadow;
    }

    if (canUseResonanceOverride(gameState)) {
      const resonance = applyResonanceOverride(gameState);
      if (resonance) return resonance;
    }

    if (canUseSymphonyOfRebirth(gameState)) {
      const rebirth = applySymphonyOfRebirth(gameState);
      if (rebirth) return rebirth;
    }
  }

  if (isDrawImminent(gameState.board, gameState.aiSymbol) || !hasWinningPath(gameState.board, gameState.aiSymbol)) {
    if (canUseSymphonyOfRebirth(gameState)) {
      const rebirth = applySymphonyOfRebirth(gameState);
      if (rebirth) return rebirth;
    }

    if (canUseResonanceOverride(gameState)) {
      const resonance = applyResonanceOverride(gameState);
      if (resonance) return resonance;
    }
  }

  if (canUseResonanceOverride(gameState)) {
    const resonance = applyResonanceOverride(gameState);
    if (resonance) return resonance;
  }

  if (canUseHecatesShadow(gameState)) {
    const shadow = applyHecatesShadow(gameState);
    if (shadow) return shadow;
  }

  if (canUseSymphonyOfRebirth(gameState)) {
    const rebirth = applySymphonyOfRebirth(gameState);
    if (rebirth) return rebirth;
  }

  return null;
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
  chooseMaestroBaitMove,
  createThreatForPlayer,
  tryMaestroAbilities,
  isDrawImminent,
  isLossImminent,
  hasWinningPath,
};
