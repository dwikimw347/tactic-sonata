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
      "multiplayerHistoryList",
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
    setError("");
    setStatus("Enter a username to begin.");
    renderBoard(EMPTY_BOARD);
    initClient();
  }

  function backToModeSelect() {
    cleanupRealtime();
    if (elements.multiplayerScreen) elements.multiplayerScreen.hidden = true;
    if (elements.modeSelectScreen) elements.modeSelectScreen.hidden = false;
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
      button.disabled = !canMove || Boolean(cell);
      button.addEventListener("click", () => makeMove(index));
      elements.multiplayerBoard.appendChild(button);
    });
  }

  function renderRoom(room) {
    if (!room) return;

    state.room = {
      ...room,
      board: normalizeBoard(room.board),
    };
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

    if (state.room.status === "waiting") {
      setStatus("Waiting for opponent...");
      setText(elements.multiplayerTurnLabel, "WAITING FOR OPPONENT");
      setText(elements.multiplayerTurnInfo, "Waiting for opponent.");
    } else if (state.room.status === "playing") {
      const myTurn = state.room.current_turn === state.symbol;
      setStatus(myTurn ? "Your turn." : "Opponent's turn.");
      setText(elements.multiplayerTurnLabel, myTurn ? `YOUR TURN - ${state.symbol}` : `OPPONENT'S TURN - ${state.room.current_turn}`);
      setText(elements.multiplayerTurnInfo, myTurn ? "Your turn." : "Opponent's turn.");
    } else {
      renderFinishedStatus(state.room);
    }

    renderBoard(state.room.board, outcome.winningPattern);
    scheduleAfkCheck(state.room);
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

    setStatus(didWin ? "You win." : `${winnerName} wins.`);
    setText(elements.multiplayerTurnLabel, didWin ? "YOU WON THIS MOVEMENT" : "OPPONENT CLAIMED THE CADENCE");
    setText(elements.multiplayerTurnInfo, `${winnerName} wins.`);
  }

  async function findMatch() {
    const client = initClient();
    if (!client) return;

    const username = validateUsername();
    if (!username) return;

    state.username = username;
    getPlayerId();
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
      setError("Unable to reach Supabase. Check configuration and policies.");
    } finally {
      elements.findMatchButton.disabled = false;
    }
  }

  async function createRoom() {
    const client = initClient();
    const { data, error } = await client
      .from("multiplayer_rooms")
      .insert({
        status: "waiting",
        player_x: state.username,
        player_x_id: state.playerId,
        board: [...EMPTY_BOARD],
        current_turn: randomTurn(),
        last_move_at: nowIso(),
      })
      .select()
      .single();

    if (error) throw error;
    enterRoom(data, "Waiting for opponent...");
  }

  async function joinRoom(room) {
    const client = initClient();
    const { data, error } = await client
      .from("multiplayer_rooms")
      .update({
        status: "playing",
        player_o: state.username,
        player_o_id: state.playerId,
        current_turn: randomTurn(),
        updated_at: nowIso(),
        last_move_at: nowIso(),
      })
      .eq("id", room.id)
      .eq("status", "waiting")
      .is("player_o_id", null)
      .select()
      .single();

    if (error) throw error;
    enterRoom(data, "Match found.");
  }

  function enterRoom(room, message) {
    if (elements.multiplayerSetupPanel) elements.multiplayerSetupPanel.hidden = true;
    if (elements.multiplayerGamePanel) elements.multiplayerGamePanel.hidden = false;
    setStatus(message);
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
    board[index] = state.symbol;
    const outcome = evaluateBoard(board);
    const nextTurn = otherSymbol(state.symbol);
    const update = {
      board,
      current_turn: outcome.winner || outcome.isDraw ? room.current_turn : nextTurn,
      updated_at: nowIso(),
      last_move_at: nowIso(),
    };

    if (outcome.winner) {
      update.status = "finished";
      update.winner = playerNameBySymbol(room, outcome.winner);
      update.result_type = "win";
    } else if (outcome.isDraw) {
      update.status = "finished";
      update.winner = null;
      update.result_type = "draw";
    }

    const { data, error } = await client
      .from("multiplayer_rooms")
      .update(update)
      .eq("id", room.id)
      .eq("status", "playing")
      .eq("current_turn", state.symbol)
      .select()
      .single();

    if (error || !data) return;
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
    elements.backToModeButton?.addEventListener("click", backToModeSelect);
    elements.multiplayerChatForm?.addEventListener("submit", sendMessage);
  }

  document.addEventListener("DOMContentLoaded", bindEvents);

  window.TacTicMultiplayer = {
    showSetup,
  };
})();
