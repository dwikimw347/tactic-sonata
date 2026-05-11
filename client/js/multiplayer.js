(() => {
  const AFK_LIMIT_MS = 20000;
  const EMPTY_BOARD = Object.freeze(Array(9).fill(null));
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

  const state = {
    client: null,
    playerId: null,
    username: "",
    symbol: null,
    room: null,
    roomChannel: null,
    messageChannel: null,
    afkTimer: null,
    historyLoadedFor: "",
    insightHintIndex: null,
    supportsSkillColumns: true,
    localSkillStateByRoom: {},
    localMoveHistoryByRoom: {},
  };

  const elements = {};

  function getElement(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    [
      "titleScreen",
      "modeSelectScreen",
      "gameScreen",
      "multiplayerScreen",
      "multiplayerSetupPanel",
      "multiplayerGamePanel",
      "multiplayerUsernameInput",
      "findMatchButton",
      "backToModeButton",
      "backToModeFromFindMatch",
      "backToFindMatchBtn",
      "multiplayerSetupError",
      "multiplayerStatusText",
      "multiplayerYouName",
      "multiplayerYouSymbol",
      "multiplayerOpponentName",
      "multiplayerOpponentSymbol",
      "multiplayerChatMessages",
      "multiplayerChatForm",
      "multiplayerChatInput",
      "multiplayerBoard",
      "multiplayerTurnLabel",
      "multiplayerRoomInfo",
      "multiplayerTurnInfo",
      "multiplayerAfkInfo",
      "multiplayerSoundButton",
      "multiplayerHistoryList",
      "multiplayerInsightButton",
      "multiplayerInsightStatus",
      "multiplayerUndoButton",
      "multiplayerUndoStatus",
      "multiplayerShieldCard",
      "multiplayerShieldStatus",
      "multiplayerShieldHint",
    ].forEach((id) => {
      elements[id] = getElement(id);
    });
  }

  function setText(node, value) {
    if (node) node.textContent = value;
  }

  function setStatus(message) {
    setText(elements.multiplayerStatusText, message);
  }

  function setError(message) {
    setText(elements.multiplayerSetupError, message);
  }

  function isMissingSkillColumnError(error) {
    const text = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();
    return text.includes("skill_state")
      || text.includes("move_history")
      || (error?.code === "PGRST204" && text.includes("schema cache"));
  }

  function formatSupabaseError(error) {
    const message = error?.message || "Check configuration and policies.";
    if (message.includes("relation") && message.includes("does not exist")) {
      return "Supabase table is missing. Run supabase/schema.sql in Supabase SQL Editor.";
    }
    if (message.toLowerCase().includes("permission denied") || error?.code === "42501") {
      return "Supabase policy blocked access. Disable RLS for demo or add public anon policies.";
    }
    if (isMissingSkillColumnError(error)) {
      return "Supabase room table needs migration. Add skill_state and move_history columns.";
    }
    if (message.toLowerCase().includes("failed to fetch")) {
      return "Supabase request failed. Check Project URL, anon key, and network access.";
    }
    return `Supabase error: ${message}`;
  }

  function baseRoomPayload(payload) {
    const { skill_state: skillState, move_history: moveHistory, ...basePayload } = payload;
    return basePayload;
  }

  async function insertRoom(payload) {
    const client = initClient();
    let response = await client
      .from("multiplayer_rooms")
      .insert(payload)
      .select()
      .single();

    if (response.error && isMissingSkillColumnError(response.error)) {
      state.supportsSkillColumns = false;
      setError("Skills are using local fallback. Run Supabase migration for realtime skill sync.");
      response = await client
        .from("multiplayer_rooms")
        .insert(baseRoomPayload(payload))
        .select()
        .single();
    }

    return response;
  }

  async function updateRoom(queryBuilder, payload) {
    let response = await queryBuilder(payload);

    if (response.error && isMissingSkillColumnError(response.error)) {
      state.supportsSkillColumns = false;
      setError("Skills are using local fallback. Run Supabase migration for realtime skill sync.");
      response = await queryBuilder(baseRoomPayload(payload));
    }

    return response;
  }

  function hideAllScreens() {
    if (elements.titleScreen) elements.titleScreen.hidden = true;
    if (elements.modeSelectScreen) elements.modeSelectScreen.hidden = true;
    if (elements.gameScreen) elements.gameScreen.hidden = true;
    if (elements.multiplayerScreen) elements.multiplayerScreen.hidden = false;
  }

  function showSetup() {
    cacheElements();
    hideAllScreens();
    if (elements.multiplayerSetupPanel) elements.multiplayerSetupPanel.hidden = false;
    if (elements.multiplayerGamePanel) elements.multiplayerGamePanel.hidden = true;
    const authUser = window.TacTicAuth?.getUser?.();
    if (authUser?.username && elements.multiplayerUsernameInput && !elements.multiplayerUsernameInput.value) {
      elements.multiplayerUsernameInput.value = authUser.username;
    }
    if (authUser?.id) {
      state.playerId = authUser.id;
    }
    if (authUser?.username) {
      window.TacTicPresence?.setUserOnline?.(authUser.username, authUser.id);
    }
    setError("");
    setStatus("Enter a username to begin.");
    state.insightHintIndex = null;
    renderBoard(EMPTY_BOARD);
    initClient();
  }

  function backToModeSelect() {
    cleanupRealtime();
    window.TacTicAudio?.stopMultiplayerMusic?.();
    window.TacTicStopModeAudio?.();
    state.room = null;
    state.symbol = null;
    state.insightHintIndex = null;
    if (elements.multiplayerScreen) elements.multiplayerScreen.hidden = true;
    if (elements.modeSelectScreen) elements.modeSelectScreen.hidden = false;
    window.TacTicPresence?.setUserOnlineAfterMatch?.();
  }

  function isConfigured() {
    return Boolean(window.TACTIC_SUPABASE_CONFIG?.isConfigured?.());
  }

  function initClient() {
    if (!isConfigured()) {
      setError("Supabase is not configured yet.");
      return null;
    }

    if (!state.client && window.supabase?.createClient) {
      const config = window.TACTIC_SUPABASE_CONFIG;
      state.client = window.supabase.createClient(config.url, config.anonKey);
    }

    if (!state.client) {
      setError("Supabase is not configured yet.");
    }

    return state.client;
  }

  function getPlayerId() {
    if (state.playerId) return state.playerId;
    const authUser = window.TacTicAuth?.getUser?.();
    if (authUser?.id) {
      state.playerId = authUser.id;
      return state.playerId;
    }
    if (window.crypto?.randomUUID) {
      state.playerId = window.crypto.randomUUID();
    } else {
      state.playerId = `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    return state.playerId;
  }

  function cleanUsername(value) {
    return String(value || "")
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 16);
  }

  function validateUsername() {
    const username = cleanUsername(elements.multiplayerUsernameInput?.value);
    if (username.length < 2) {
      setError("Username must be 2-16 characters.");
      return null;
    }
    setError("");
    return username;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function randomTurn() {
    return Math.random() < 0.5 ? "X" : "O";
  }

  function evaluateBoard(board) {
    for (const pattern of WIN_PATTERNS) {
      const [a, b, c] = pattern;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], winningPattern: pattern, isDraw: false };
      }
    }

    return {
      winner: null,
      winningPattern: [],
      isDraw: board.every(Boolean),
    };
  }

  function normalizeBoard(board) {
    return Array.isArray(board) && board.length === 9
      ? board.map((cell) => (cell === "X" || cell === "O" ? cell : null))
      : [...EMPTY_BOARD];
  }

  function playerNameBySymbol(room, symbol) {
    return symbol === "X" ? room?.player_x : room?.player_o;
  }

  function playerIdBySymbol(room, symbol) {
    return symbol === "X" ? room?.player_x_id : room?.player_o_id;
  }

  function otherSymbol(symbol) {
    return symbol === "X" ? "O" : "X";
  }

  function getOpponentName(room) {
    if (!room || !state.symbol) return "Waiting...";
    return state.symbol === "X" ? room.player_o || "Waiting..." : room.player_x || "Waiting...";
  }

  function inferSymbol(room) {
    const playerId = getPlayerId();
    if (room?.player_x_id === playerId) return "X";
    if (room?.player_o_id === playerId) return "O";
    return null;
  }

  function renderBoard(board, winningPattern = []) {
    if (!elements.multiplayerBoard) return;

    const safeBoard = normalizeBoard(board);
    const canMove = state.room?.status === "playing"
      && state.room.current_turn === state.symbol;

    elements.multiplayerBoard.classList.toggle("is-active", state.room?.status === "playing");
    elements.multiplayerBoard.classList.toggle("is-locked", !canMove);
    elements.multiplayerBoard.innerHTML = "";

    safeBoard.forEach((cell, index) => {
      const button = document.createElement("button");
      button.className = "cell";
      button.type = "button";
      button.textContent = cell || "";
      button.setAttribute("aria-label", `Cell ${index + 1}${cell ? ` marked ${cell}` : ""}`);
      if (cell) button.classList.add("marked");
      if (winningPattern.includes(index)) button.classList.add("win");
      if (state.insightHintIndex === index && !cell) button.classList.add("insight-hint");
      button.disabled = !canMove || Boolean(cell);
      button.addEventListener("click", () => {
        window.TacTicAudio?.playClick();
        makeMove(index);
      });
      elements.multiplayerBoard.appendChild(button);
    });
  }

  function renderRoom(room) {
    if (!room) return;
    const defaultSkillState = window.TacTicSkills?.createDefaultSkillState?.();
    const storedSkillState = state.supportsSkillColumns
      ? room.skill_state
      : state.localSkillStateByRoom[room.id] || defaultSkillState;
    const storedMoveHistory = state.supportsSkillColumns
      ? room.move_history
      : state.localMoveHistoryByRoom[room.id] || [];

    state.room = {
      ...room,
      board: normalizeBoard(room.board),
      skill_state: window.TacTicSkills?.normalizeSkillState(storedSkillState),
      move_history: Array.isArray(storedMoveHistory) ? storedMoveHistory : [],
    };
    state.localSkillStateByRoom[room.id] = state.room.skill_state;
    state.localMoveHistoryByRoom[room.id] = state.room.move_history;
    state.symbol = inferSymbol(state.room);

    const outcome = evaluateBoard(state.room.board);
    const opponentName = getOpponentName(state.room);
    const myName = state.username || playerNameBySymbol(state.room, state.symbol) || "You";
    const opponentSymbol = state.symbol ? otherSymbol(state.symbol) : "-";

    setText(elements.multiplayerYouName, myName);
    setText(elements.multiplayerYouSymbol, state.symbol ? `You are ${state.symbol}` : "You are -");
    setText(elements.multiplayerOpponentName, opponentName);
    setText(elements.multiplayerOpponentSymbol, opponentName === "Waiting..." ? "Opponent is -" : `Opponent is ${opponentSymbol}`);
    setText(elements.multiplayerRoomInfo, `Room ${String(state.room.id).slice(0, 8)} - ${state.room.status}`);
    window.TacTicPresence?.renderPresence?.();

    if (state.room.status === "waiting") {
      window.TacTicPresence?.setUserSearching?.(state.username, state.playerId);
      setStatus("Waiting for opponent...");
      setText(elements.multiplayerTurnLabel, "WAITING FOR OPPONENT");
      setText(elements.multiplayerTurnInfo, "Waiting for opponent.");
    } else if (state.room.status === "playing") {
      window.TacTicPresence?.setUserInMatch?.(state.room.id);
      const myTurn = state.room.current_turn === state.symbol;
      setStatus(myTurn ? "Your turn." : "Opponent's turn.");
      setText(elements.multiplayerTurnLabel, myTurn ? `YOUR TURN - ${state.symbol}` : `OPPONENT'S TURN - ${state.room.current_turn}`);
      setText(elements.multiplayerTurnInfo, myTurn ? "Your turn." : "Opponent's turn.");
    } else {
      window.TacTicPresence?.setUserOnlineAfterMatch?.();
      renderFinishedStatus(state.room);
    }

    renderBoard(state.room.board, outcome.winningPattern);
    renderSkillPanel();
    renderBackToFindMatchButton(state.room);
    scheduleAfkCheck(state.room);
  }

  function renderBackToFindMatchButton(room) {
    if (!elements.backToFindMatchBtn) return;
    elements.backToFindMatchBtn.hidden = !room;
    if (!room) return;
    if (room.status === "waiting") {
      elements.backToFindMatchBtn.textContent = "Cancel Search";
    } else if (room.status === "playing") {
      elements.backToFindMatchBtn.textContent = "Leave Match";
    } else {
      elements.backToFindMatchBtn.textContent = "Back to Find Match";
    }
  }

  function getSkillState(room = state.room) {
    return window.TacTicSkills?.normalizeSkillState(room?.skill_state);
  }

  function rememberLocalSkillState(roomId, skillState) {
    if (!roomId) return;
    state.localSkillStateByRoom[roomId] = window.TacTicSkills?.normalizeSkillState(skillState);
    if (state.room?.id === roomId) {
      state.room.skill_state = state.localSkillStateByRoom[roomId];
    }
  }

  function rememberLocalMoveHistory(roomId, moveHistory) {
    if (!roomId) return;
    state.localMoveHistoryByRoom[roomId] = Array.isArray(moveHistory) ? moveHistory : [];
    if (state.room?.id === roomId) {
      state.room.move_history = state.localMoveHistoryByRoom[roomId];
    }
  }

  function getPlayerSkill(symbol = state.symbol, room = state.room) {
    const skillState = getSkillState(room);
    const key = window.TacTicSkills?.playerKey(symbol);
    return skillState?.[key] || { insight: 0, undo: 0, shield: "spent" };
  }

  function renderSkillPanel() {
    const skills = getPlayerSkill();
    const canUse = state.room?.status === "playing";
    const undoAvailable = canUse && canUndoCurrentPlayer();

    if (elements.multiplayerInsightStatus) {
      elements.multiplayerInsightStatus.textContent = `${skills.insight}/2`;
    }
    if (elements.multiplayerInsightButton) {
      elements.multiplayerInsightButton.disabled = !canUse || skills.insight <= 0 || state.room?.current_turn !== state.symbol;
      elements.multiplayerInsightButton.classList.toggle("skill-spent", skills.insight <= 0);
      elements.multiplayerInsightButton.classList.toggle("active", state.insightHintIndex !== null);
    }

    if (elements.multiplayerUndoStatus) {
      elements.multiplayerUndoStatus.textContent = skills.undo > 0 ? "1/1" : "Used";
    }
    if (elements.multiplayerUndoButton) {
      elements.multiplayerUndoButton.disabled = !undoAvailable || skills.undo <= 0;
      elements.multiplayerUndoButton.classList.toggle("skill-spent", skills.undo <= 0);
    }

    if (elements.multiplayerShieldStatus) {
      elements.multiplayerShieldStatus.textContent = skills.shield === "ready" ? "Ready" : "Spent";
    }
    if (elements.multiplayerShieldHint) {
      elements.multiplayerShieldHint.textContent = skills.shield === "ready" ? "Armed." : "Spent.";
    }
    if (elements.multiplayerShieldCard) {
      elements.multiplayerShieldCard.classList.toggle("active", skills.shield === "ready");
      elements.multiplayerShieldCard.classList.toggle("skill-spent", skills.shield !== "ready");
    }
  }

  function renderFinishedStatus(room) {
    const winnerName = room.winner || "No one";
    if (room.result_type === "draw") {
      setStatus("The match ends in a draw.");
      setText(elements.multiplayerTurnLabel, "DRAW - SUSPENDED CHORD");
      setText(elements.multiplayerTurnInfo, "Draw.");
      return;
    }

    const didWin = room.winner && room.winner === state.username;
    if (room.result_type === "afk") {
      setStatus(didWin ? "Opponent AFK. You win." : "You were AFK. You lose.");
      setText(elements.multiplayerTurnLabel, didWin ? "OPPONENT AFK - YOU WIN" : "AFK LOSS");
      setText(elements.multiplayerTurnInfo, `${winnerName} wins by AFK.`);
      return;
    }

    if (room.result_type === "left") {
      setStatus(didWin ? "Opponent left. You win." : "You left the match.");
      setText(elements.multiplayerTurnLabel, didWin ? "OPPONENT LEFT - YOU WIN" : "MATCH LEFT");
      setText(elements.multiplayerTurnInfo, `${winnerName} wins by forfeit.`);
      return;
    }

    setStatus(didWin ? "You win." : `${winnerName} wins.`);
    setText(elements.multiplayerTurnLabel, didWin ? "YOU WON THIS MOVEMENT" : "OPPONENT CLAIMED THE CADENCE");
    setText(elements.multiplayerTurnInfo, `${winnerName} wins.`);
  }

  async function findMatch() {
    window.TacTicAudio?.playClick();
    const client = initClient();
    if (!client) return;

    const username = validateUsername();
    if (!username) return;

    state.username = username;
    getPlayerId();
    window.TacTicPresence?.setUserSearching?.(state.username, state.playerId);
    setStatus("Searching for an opponent...");
    elements.findMatchButton.disabled = true;

    try {
      const { data: waitingRooms, error: findError } = await client
        .from("multiplayer_rooms")
        .select("*")
        .eq("status", "waiting")
        .is("player_o_id", null)
        .neq("player_x_id", state.playerId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (findError) throw findError;

      if (waitingRooms?.length) {
        await joinRoom(waitingRooms[0]);
      } else {
        await createRoom();
      }
    } catch (error) {
      setError(formatSupabaseError(error));
    } finally {
      elements.findMatchButton.disabled = false;
    }
  }

  async function createRoom() {
    const { data, error } = await insertRoom({
      status: "waiting",
      player_x: state.username,
      player_x_id: state.playerId,
      board: [...EMPTY_BOARD],
      skill_state: window.TacTicSkills?.createDefaultSkillState?.(),
      move_history: [],
      current_turn: randomTurn(),
      last_move_at: nowIso(),
    });

    if (error) throw error;
    enterRoom(data, "Waiting for opponent...");
  }

  async function joinRoom(room) {
    const client = initClient();
    const { data, error } = await updateRoom(
      (payload) => client
        .from("multiplayer_rooms")
        .update(payload)
        .eq("id", room.id)
        .eq("status", "waiting")
        .is("player_o_id", null)
        .select()
        .single(),
      {
        status: "playing",
        player_o: state.username,
        player_o_id: state.playerId,
        skill_state: room.skill_state || window.TacTicSkills?.createDefaultSkillState?.(),
        move_history: Array.isArray(room.move_history) ? room.move_history : [],
        current_turn: randomTurn(),
        updated_at: nowIso(),
        last_move_at: nowIso(),
      },
    );

    if (error) throw error;
    enterRoom(data, "Match found.");
  }

  function enterRoom(room, message) {
    if (elements.multiplayerSetupPanel) elements.multiplayerSetupPanel.hidden = true;
    if (elements.multiplayerGamePanel) elements.multiplayerGamePanel.hidden = false;
    setStatus(message);
    state.insightHintIndex = null;
    window.TacTicAudio?.playMultiplayerMusic();
    renderRoom(room);
    subscribeToRoom(room.id);
    subscribeToMessages(room.id);
    loadHistory();
  }

  function cleanupRealtime() {
    if (state.afkTimer) window.clearTimeout(state.afkTimer);
    if (state.client && state.roomChannel) state.client.removeChannel(state.roomChannel);
    if (state.client && state.messageChannel) state.client.removeChannel(state.messageChannel);
    state.afkTimer = null;
    state.roomChannel = null;
    state.messageChannel = null;
  }

  async function deleteWaitingRoom(room = state.room) {
    const client = initClient();
    if (!client || !room || room.status !== "waiting") return;
    if (room.player_x_id !== state.playerId) return;

    await client
      .from("multiplayer_rooms")
      .delete()
      .eq("id", room.id)
      .eq("status", "waiting")
      .eq("player_x_id", state.playerId);
  }

  async function leavePlayingRoom(room = state.room) {
    const client = initClient();
    if (!client || !room || room.status !== "playing") return false;

    const confirmed = window.confirm("Leave current match?");
    if (!confirmed) return false;

    const winnerSymbol = otherSymbol(state.symbol);
    const update = {
      status: "finished",
      winner: playerNameBySymbol(room, winnerSymbol),
      result_type: "left",
      updated_at: nowIso(),
    };

    const { data, error } = await client
      .from("multiplayer_rooms")
      .update(update)
      .eq("id", room.id)
      .eq("status", "playing")
      .select()
      .single();

    if (error || !data) {
      setError(formatSupabaseError(error));
      return false;
    }

    await insertHistory(data);
    return true;
  }

  async function backToFindMatch() {
    window.TacTicAudio?.playClick();
    const room = state.room;

    if (room?.status === "waiting") {
      await deleteWaitingRoom(room);
    } else if (room?.status === "playing") {
      const didLeave = await leavePlayingRoom(room);
      if (!didLeave) return;
    }

    cleanupRealtime();
    window.TacTicAudio?.stopMultiplayerMusic?.();
    window.TacTicStopModeAudio?.();
    state.room = null;
    state.symbol = null;
    state.insightHintIndex = null;
    if (elements.multiplayerChatMessages) elements.multiplayerChatMessages.innerHTML = "";
    if (elements.multiplayerGamePanel) elements.multiplayerGamePanel.hidden = true;
    if (elements.multiplayerSetupPanel) elements.multiplayerSetupPanel.hidden = false;
    setError("");
    setStatus("Enter a username to begin.");
    window.TacTicPresence?.setUserOnlineAfterMatch?.();
  }

  function subscribeToRoom(roomId) {
    const client = initClient();
    if (!client) return;
    if (state.roomChannel) client.removeChannel(state.roomChannel);

    state.roomChannel = client
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "multiplayer_rooms", filter: `id=eq.${roomId}` },
        (payload) => renderRoom(payload.new),
      )
      .subscribe();
  }

  async function subscribeToMessages(roomId) {
    const client = initClient();
    if (!client) return;
    if (state.messageChannel) client.removeChannel(state.messageChannel);
    if (elements.multiplayerChatMessages) elements.multiplayerChatMessages.innerHTML = "";

    const { data } = await client
      .from("multiplayer_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(80);

    (data || []).forEach(renderMessage);

    state.messageChannel = client
      .channel(`messages-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "multiplayer_messages", filter: `room_id=eq.${roomId}` },
        (payload) => renderMessage(payload.new),
      )
      .subscribe();
  }

  async function makeMove(index) {
    const client = initClient();
    const room = state.room;
    if (!client || !room) return;
    if (room.status !== "playing" || room.current_turn !== state.symbol || room.board[index]) return;

    const board = normalizeBoard(room.board);
    const previousBoard = [...board];
    board[index] = state.symbol;
    const outcome = evaluateBoard(board);
    const nextTurn = otherSymbol(state.symbol);
    const skillState = getSkillState(room);
    const defenderSymbol = otherSymbol(state.symbol);
    const defenderKey = window.TacTicSkills?.playerKey(defenderSymbol);
    const moveHistory = Array.isArray(room.move_history) ? [...room.move_history] : [];
    let shieldCanceledWin = false;

    if (state.supportsSkillColumns && outcome.winner === state.symbol && skillState?.[defenderKey]?.shield === "ready") {
      board[index] = null;
      skillState[defenderKey].shield = "spent";
      shieldCanceledWin = true;
      setStatus("Harmony Shield cancelled the fatal move.");
    } else {
      moveHistory.push({
        by: state.symbol,
        index,
        board: previousBoard,
        current_turn: room.current_turn,
        created_at: nowIso(),
      });
    }

    const update = {
      board,
      current_turn: shieldCanceledWin ? nextTurn : outcome.winner || outcome.isDraw ? room.current_turn : nextTurn,
      updated_at: nowIso(),
      last_move_at: nowIso(),
    };

    if (state.supportsSkillColumns) {
      update.skill_state = skillState;
      update.move_history = moveHistory.slice(-8);
    } else {
      rememberLocalSkillState(room.id, skillState);
      rememberLocalMoveHistory(room.id, moveHistory.slice(-8));
    }

    if (outcome.winner && !shieldCanceledWin) {
      update.status = "finished";
      update.winner = playerNameBySymbol(room, outcome.winner);
      update.result_type = "win";
    } else if (outcome.isDraw && !shieldCanceledWin) {
      update.status = "finished";
      update.winner = null;
      update.result_type = "draw";
    }

    const { data, error } = await updateRoom(
      (payload) => client
        .from("multiplayer_rooms")
        .update(payload)
        .eq("id", room.id)
        .eq("status", "playing")
        .eq("current_turn", state.symbol)
        .select()
        .single(),
      update,
    );

    if (error || !data) return;
    state.insightHintIndex = null;
    renderRoom(data);

    if (update.status === "finished") {
      await insertHistory(data);
      await loadHistory();
    }
  }

  function scheduleAfkCheck(room) {
    if (state.afkTimer) window.clearTimeout(state.afkTimer);
    state.afkTimer = null;

    if (!room || room.status !== "playing" || !room.current_turn) return;

    const lastMoveAt = new Date(room.last_move_at || room.updated_at || room.created_at).getTime();
    const elapsed = Date.now() - lastMoveAt;
    const delay = Math.max(AFK_LIMIT_MS - elapsed, 0) + 250;

    setText(elements.multiplayerAfkInfo, "AFK limit: 20 seconds.");
    state.afkTimer = window.setTimeout(() => finishAfkIfStillValid(room), delay);
  }

  async function finishAfkIfStillValid(roomSnapshot) {
    const client = initClient();
    const room = state.room;
    if (!client || !room || room.status !== "playing") return;
    if (room.id !== roomSnapshot.id || room.last_move_at !== roomSnapshot.last_move_at) return;

    const afkSymbol = room.current_turn;
    const winnerSymbol = otherSymbol(afkSymbol);
    const update = {
      status: "finished",
      winner: playerNameBySymbol(room, winnerSymbol),
      result_type: "afk",
      updated_at: nowIso(),
    };

    const { data, error } = await client
      .from("multiplayer_rooms")
      .update(update)
      .eq("id", room.id)
      .eq("status", "playing")
      .eq("last_move_at", room.last_move_at)
      .select()
      .single();

    if (error || !data) return;
    renderRoom(data);
    await insertHistory(data);
    await loadHistory();
  }

  async function insertHistory(room) {
    const client = initClient();
    if (!client || !room?.id || !room.result_type) return;

    await client
      .from("multiplayer_history")
      .insert({
        room_id: room.id,
        player_x: room.player_x,
        player_o: room.player_o,
        winner: room.winner || null,
        result_type: room.result_type,
        started_at: room.created_at,
        ended_at: nowIso(),
      });
  }

  async function useInsight() {
    const client = initClient();
    const room = state.room;
    if (!client || !room || room.status !== "playing") {
      setStatus("Insight cannot be used before the match starts.");
      return;
    }
    if (room.current_turn !== state.symbol) {
      setStatus("Insight can only be used on your turn.");
      return;
    }

    const skillState = getSkillState(room);
    const key = window.TacTicSkills?.playerKey(state.symbol);
    if (!skillState?.[key] || skillState[key].insight <= 0) {
      setStatus("Insight Move is spent.");
      return;
    }

    window.TacTicAudio?.playClick();
    const bestMove = window.TacTicSkills?.findBestMove(room.board, state.symbol);
    if (bestMove === null || bestMove === undefined) {
      setStatus("No legal insight remains.");
      return;
    }

    skillState[key].insight -= 1;
    rememberLocalSkillState(room.id, skillState);

    if (!state.supportsSkillColumns) {
      state.insightHintIndex = bestMove;
      setStatus("Insight Move revealed a recommended cell.");
      renderSkillPanel();
      renderBoard(room.board, evaluateBoard(room.board).winningPattern);
      return;
    }

    const { data, error } = await client
      .from("multiplayer_rooms")
      .update({
        skill_state: skillState,
        updated_at: nowIso(),
      })
      .eq("id", room.id)
      .eq("status", "playing")
      .select()
      .single();

    if (error || !data) {
      skillState[key].insight += 1;
      rememberLocalSkillState(room.id, skillState);
      setStatus(formatSupabaseError(error));
      renderSkillPanel();
      return;
    }
    state.insightHintIndex = bestMove;
    setStatus("Insight Move revealed a recommended cell.");
    renderRoom(data);
  }

  function canUndoCurrentPlayer(room = state.room) {
    if (!room || room.status !== "playing" || !state.symbol) return false;
    const history = Array.isArray(room.move_history) ? room.move_history : [];
    const lastMove = history[history.length - 1];
    return Boolean(
      lastMove
        && lastMove.by === state.symbol
        && room.current_turn === otherSymbol(state.symbol)
        && room.board?.[lastMove.index] === state.symbol,
    );
  }

  async function useUndo() {
    const client = initClient();
    const room = state.room;
    if (!client || !room) return;
    if (!canUndoCurrentPlayer(room)) {
      setStatus("Undo is only available before your opponent replies.");
      return;
    }

    const skillState = getSkillState(room);
    const key = window.TacTicSkills?.playerKey(state.symbol);
    if (!skillState?.[key] || skillState[key].undo <= 0) {
      setStatus("Undo Move is spent.");
      return;
    }

    window.TacTicAudio?.playClick();
    const moveHistory = [...room.move_history];
    const lastMove = moveHistory.pop();
    skillState[key].undo = 0;
    const restoredBoard = window.TacTicSkills?.normalizeBoard(lastMove.board);
    rememberLocalSkillState(room.id, skillState);
    rememberLocalMoveHistory(room.id, moveHistory);

    if (!state.supportsSkillColumns) {
      state.room = {
        ...room,
        board: restoredBoard,
        current_turn: state.symbol,
        skill_state: skillState,
        move_history: moveHistory,
      };
      state.insightHintIndex = null;
      setStatus("Undo Move restored your latest note locally.");
      renderRoom(state.room);
      return;
    }

    const { data, error } = await client
      .from("multiplayer_rooms")
      .update({
        board: restoredBoard,
        current_turn: state.symbol,
        skill_state: skillState,
        move_history: moveHistory,
        updated_at: nowIso(),
        last_move_at: nowIso(),
      })
      .eq("id", room.id)
      .eq("status", "playing")
      .eq("current_turn", otherSymbol(state.symbol))
      .select()
      .single();

    if (error || !data) {
      skillState[key].undo = 1;
      rememberLocalSkillState(room.id, skillState);
      rememberLocalMoveHistory(room.id, room.move_history);
      setStatus(formatSupabaseError(error));
      renderSkillPanel();
      return;
    }
    state.insightHintIndex = null;
    setStatus("Undo Move restored your latest note.");
    renderRoom(data);
  }

  function toggleSound() {
    const wasMuted = Boolean(window.TacTicAudio?.isMuted?.());
    if (!wasMuted) window.TacTicAudio?.playClick();
    const muted = window.TacTicAudio?.toggleMuted?.();
    if (wasMuted) window.TacTicAudio?.playClick();
    if (elements.multiplayerSoundButton) {
      elements.multiplayerSoundButton.textContent = muted ? "Sound Off" : "Sound On";
      elements.multiplayerSoundButton.setAttribute("aria-pressed", String(Boolean(muted)));
    }
  }

  async function loadHistory() {
    const client = initClient();
    if (!client || !state.username) return;

    const [asX, asO] = await Promise.all([
      client.from("multiplayer_history").select("*").eq("player_x", state.username).order("ended_at", { ascending: false }).limit(5),
      client.from("multiplayer_history").select("*").eq("player_o", state.username).order("ended_at", { ascending: false }).limit(5),
    ]);

    const rows = [...(asX.data || []), ...(asO.data || [])]
      .sort((a, b) => new Date(b.ended_at) - new Date(a.ended_at))
      .slice(0, 5);

    renderHistory(rows);
  }

  function renderHistory(rows) {
    if (!elements.multiplayerHistoryList) return;
    elements.multiplayerHistoryList.innerHTML = "";

    if (!rows.length) {
      const item = document.createElement("li");
      item.textContent = "No matches yet.";
      elements.multiplayerHistoryList.appendChild(item);
      return;
    }

    rows.forEach((row) => {
      const item = document.createElement("li");
      const winner = row.winner || "Draw";
      item.textContent = `${winner} - ${row.result_type}`;
      elements.multiplayerHistoryList.appendChild(item);
    });
  }

  async function sendMessage(event) {
    event.preventDefault();
    const client = initClient();
    if (!client || !state.room) return;

    const message = String(elements.multiplayerChatInput?.value || "").trim().slice(0, 120);
    if (!message) return;

    window.TacTicAudio?.playClick();
    elements.multiplayerChatInput.value = "";
    await client.from("multiplayer_messages").insert({
      room_id: state.room.id,
      sender_id: state.playerId,
      sender_name: state.username,
      message,
    });
  }

  function renderMessage(message) {
    if (!elements.multiplayerChatMessages || !message) return;
    const row = document.createElement("div");
    row.className = "multiplayer-chat-message";

    const sender = document.createElement("strong");
    sender.textContent = `${message.sender_name || "Player"}:`;

    const body = document.createElement("span");
    body.textContent = ` ${String(message.message || "").slice(0, 120)}`;

    row.append(sender, body);
    elements.multiplayerChatMessages.appendChild(row);
    elements.multiplayerChatMessages.scrollTop = elements.multiplayerChatMessages.scrollHeight;
  }

  function bindEvents() {
    cacheElements();
    elements.findMatchButton?.addEventListener("click", findMatch);
    const backToModeButton = elements.backToModeFromFindMatch || elements.backToModeButton;
    backToModeButton?.addEventListener("click", () => {
      window.TacTicAudio?.playClick();
      backToModeSelect();
    });
    elements.backToFindMatchBtn?.addEventListener("click", backToFindMatch);
    elements.multiplayerChatForm?.addEventListener("submit", sendMessage);
    elements.multiplayerInsightButton?.addEventListener("click", useInsight);
    elements.multiplayerUndoButton?.addEventListener("click", useUndo);
    elements.multiplayerSoundButton?.addEventListener("click", toggleSound);
  }

  document.addEventListener("DOMContentLoaded", bindEvents);

  window.TacTicMultiplayer = {
    showSetup,
  };
})();
