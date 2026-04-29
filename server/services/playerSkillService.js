const { WIN_PATTERNS, evaluateBoard, findBestMove, getAvailableMoves } = require('./minimaxService');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createSkillState() {
  return {
    insight: {
      maxUses: 2,
      used: 0,
      lastSuggestedMove: null,
    },
    undo: {
      maxUses: 1,
      used: 0,
    },
    harmonyShield: {
      maxUses: 1,
      used: false,
      active: false,
      pendingBlockMove: null,
    },
  };
}

function ensureSkillState(game) {
  if (!game.skills) {
    game.skills = createSkillState();
  }

  return game.skills;
}

function ensureHistory(game) {
  if (!Array.isArray(game.history)) {
    game.history = [];
  }

  return game.history;
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

function wouldWin(board, index, symbol) {
  if (!Number.isInteger(index) || board[index]) return false;

  const nextBoard = [...board];
  nextBoard[index] = symbol;
  return evaluateBoard(nextBoard).winner === symbol;
}

function findImmediateWinningMove(board, symbol) {
  return getAvailableMoves(board).find((move) => wouldWin(board, move, symbol)) ?? null;
}

function chooseStrategicFallback(board, playerSymbol, aiSymbol) {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return null;

  // Center and corners keep the hint useful even before minimax finds a forced line.
  if (availableMoves.includes(4)) return 4;

  const bestMove = findBestMove(board, playerSymbol, aiSymbol);
  if (bestMove !== null && availableMoves.includes(bestMove)) return bestMove;

  const corners = [0, 2, 6, 8].filter((index) => availableMoves.includes(index));
  if (corners.length > 0) return corners[0];

  return availableMoves[0];
}

function findInsightMove(board, playerSymbol, aiSymbol) {
  const availableMoves = getAvailableMoves(board);
  if (availableMoves.length === 0) return null;

  const winningMove = findImmediateWinningMove(board, playerSymbol);
  if (winningMove !== null) return winningMove;

  const blockingMove = findLineGap(board, aiSymbol);
  if (blockingMove !== null && availableMoves.includes(blockingMove)) return blockingMove;

  return chooseStrategicFallback(board, playerSymbol, aiSymbol);
}

function detectHarmonyThreat(board, playerSymbol, aiSymbol) {
  const blockMoveIndex = findLineGap(board, aiSymbol);
  const isThreatDetected = blockMoveIndex !== null && !board[blockMoveIndex];

  return {
    isThreatDetected,
    blockMoveIndex: isThreatDetected ? blockMoveIndex : null,
    canAutoBlock: isThreatDetected && !wouldWin(board, blockMoveIndex, playerSymbol),
  };
}

function isPlayerTurn(game) {
  return Boolean(game && game.status === 'playing' && game.currentTurn === game.playerSymbol);
}

function getLastPlayerMoveIndex(history) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].by === 'player') return index;
  }

  return -1;
}

function getSkillStatus(game) {
  const baseSkills = game ? ensureSkillState(game) : createSkillState();
  const history = game ? ensureHistory(game) : [];
  const playerTurn = isPlayerTurn(game);
  const gamePlaying = Boolean(game && game.status === 'playing');
  const harmony = baseSkills.harmonyShield;

  return {
    insight: {
      maxUses: baseSkills.insight.maxUses,
      used: baseSkills.insight.used,
      remaining: Math.max(baseSkills.insight.maxUses - baseSkills.insight.used, 0),
      lastSuggestedMove: baseSkills.insight.lastSuggestedMove,
      canUse: playerTurn && baseSkills.insight.used < baseSkills.insight.maxUses,
    },
    undo: {
      maxUses: baseSkills.undo.maxUses,
      used: baseSkills.undo.used,
      remaining: Math.max(baseSkills.undo.maxUses - baseSkills.undo.used, 0),
      canUse: gamePlaying && baseSkills.undo.used < baseSkills.undo.maxUses && getLastPlayerMoveIndex(history) !== -1,
    },
    harmonyShield: {
      maxUses: harmony.maxUses,
      used: harmony.used,
      remaining: harmony.used ? 0 : 1,
      active: harmony.active,
      pendingBlockMove: harmony.pendingBlockMove,
      isThreatDetected: harmony.active && harmony.pendingBlockMove !== null,
      canUse: playerTurn && harmony.active && harmony.pendingBlockMove !== null
        && !wouldWin(game.board, harmony.pendingBlockMove, game.playerSymbol),
    },
  };
}

function useInsight(game) {
  const skills = ensureSkillState(game);

  if (!isPlayerTurn(game)) {
    return {
      ok: false,
      statusCode: 409,
      message: 'Insight can only be heard during your measure.',
    };
  }

  if (skills.insight.used >= skills.insight.maxUses) {
    return {
      ok: false,
      statusCode: 409,
      message: 'The silence has no more guidance to lend.',
    };
  }

  const bestMoveIndex = findInsightMove(game.board, game.playerSymbol, game.aiSymbol);
  if (bestMoveIndex === null) {
    return {
      ok: false,
      statusCode: 409,
      message: 'No legal note remains upon the board.',
    };
  }

  skills.insight.used += 1;
  skills.insight.lastSuggestedMove = bestMoveIndex;

  return {
    ok: true,
    message: 'Ah... seeking guidance from the silence? How human.',
    data: {
      bestMoveIndex,
      skills: getSkillStatus(game),
    },
  };
}

function clearHarmonyShield(game) {
  const skills = ensureSkillState(game);
  skills.harmonyShield.active = false;
  skills.harmonyShield.pendingBlockMove = null;
}

function armHarmonyShield(game) {
  const skills = ensureSkillState(game);
  const shield = skills.harmonyShield;

  if (!isPlayerTurn(game)) {
    return {
      isThreatDetected: false,
      blockMoveIndex: null,
      canAutoBlock: false,
      activated: false,
    };
  }

  if (shield.active && shield.pendingBlockMove !== null) {
    const currentCanAutoBlock = !wouldWin(game.board, shield.pendingBlockMove, game.playerSymbol);
    return {
      isThreatDetected: true,
      blockMoveIndex: shield.pendingBlockMove,
      canAutoBlock: currentCanAutoBlock,
      activated: false,
    };
  }

  if (shield.used) {
    return {
      isThreatDetected: false,
      blockMoveIndex: null,
      canAutoBlock: false,
      activated: false,
    };
  }

  const threat = detectHarmonyThreat(game.board, game.playerSymbol, game.aiSymbol);
  if (!threat.isThreatDetected) {
    return { ...threat, activated: false };
  }

  shield.used = true;
  shield.active = true;
  shield.pendingBlockMove = threat.blockMoveIndex;

  return {
    ...threat,
    activated: true,
  };
}

function useHarmonyShield(game) {
  const threat = armHarmonyShield(game);

  if (!threat.isThreatDetected) {
    return {
      ok: false,
      statusCode: 409,
      message: 'No fatal phrase needs harmony yet.',
      data: {
        isThreatDetected: false,
        blockMoveIndex: null,
        skills: getSkillStatus(game),
      },
    };
  }

  if (!threat.canAutoBlock) {
    return {
      ok: false,
      statusCode: 409,
      message: 'Harmony Shield refuses to turn defense into an automatic victory.',
      data: {
        isThreatDetected: true,
        blockMoveIndex: threat.blockMoveIndex,
        skills: getSkillStatus(game),
      },
    };
  }

  const move = threat.blockMoveIndex;
  if (game.board[move]) {
    return {
      ok: false,
      statusCode: 409,
      message: 'That shielded note is already occupied.',
      data: {
        isThreatDetected: false,
        blockMoveIndex: null,
        skills: getSkillStatus(game),
      },
    };
  }

  game.board[move] = game.playerSymbol;
  game.lastMove = {
    by: 'player',
    index: move,
    skill: 'harmonyShield',
  };
  ensureHistory(game).push({
    by: 'player',
    symbol: game.playerSymbol,
    index: move,
    skill: 'harmonyShield',
  });
  game.currentTurn = game.aiSymbol;
  clearHarmonyShield(game);

  return {
    ok: true,
    message: 'You resist the inevitable... admirable, yet fragile.',
    data: {
      isThreatDetected: true,
      blockMoveIndex: move,
      game,
      skills: getSkillStatus(game),
    },
  };
}

function undoLastPlayerTurn(game) {
  const skills = ensureSkillState(game);
  const history = ensureHistory(game);

  if (!game || game.status !== 'playing') {
    return {
      ok: false,
      statusCode: 409,
      message: 'Fate cannot be rewritten after the final note.',
    };
  }

  if (skills.undo.used >= skills.undo.maxUses) {
    return {
      ok: false,
      statusCode: 409,
      message: 'The measure has already been repeated once.',
    };
  }

  const lastPlayerIndex = getLastPlayerMoveIndex(history);
  if (lastPlayerIndex === -1) {
    return {
      ok: false,
      statusCode: 409,
      message: 'There is no player note to erase.',
    };
  }

  const removedMoves = history.slice(lastPlayerIndex);
  const restoredGame = clone(game);

  removedMoves.forEach((move) => {
    restoredGame.board[move.index] = null;
  });

  restoredGame.history = restoredGame.history.slice(0, lastPlayerIndex);
  restoredGame.currentTurn = restoredGame.playerSymbol;
  restoredGame.status = 'playing';
  restoredGame.winner = null;
  restoredGame.winningPattern = [];
  restoredGame.lastMove = restoredGame.history[restoredGame.history.length - 1] || null;
  restoredGame.skills.undo.used += 1;
  restoredGame.skills.insight.lastSuggestedMove = null;
  clearHarmonyShield(restoredGame);

  return {
    ok: true,
    message: 'You wish to rewrite fate? Very well... let the measure begin anew.',
    data: {
      game: restoredGame,
      removedMoves,
      skills: getSkillStatus(restoredGame),
    },
  };
}

module.exports = {
  armHarmonyShield,
  clearHarmonyShield,
  createSkillState,
  detectHarmonyThreat,
  findInsightMove,
  getSkillStatus,
  undoLastPlayerTurn,
  useHarmonyShield,
  useInsight,
};
