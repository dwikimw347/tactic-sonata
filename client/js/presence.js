(() => {
  const HEARTBEAT_MS = 15000;
  const OFFLINE_AFTER_MS = 45000;
  const VALID_STATUSES = new Set(['online', 'offline', 'searching', 'in_match']);

  const state = {
    client: null,
    channel: null,
    heartbeatTimer: null,
    records: new Map(),
    username: '',
    userId: null,
    status: 'offline',
    currentRoomId: null,
    rowId: null,
  };

  const elements = {};

  function cacheElements() {
    [
      'sessionPresenceDot',
      'sessionPresenceLabel',
      'multiplayerSetupPresenceDot',
      'multiplayerSetupPresenceLabel',
      'multiplayerYouPresenceDot',
      'multiplayerYouPresenceLabel',
      'multiplayerOpponentPresenceDot',
      'multiplayerOpponentPresenceLabel',
      'multiplayerOpponentName',
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });
  }

  function isConfigured() {
    return Boolean(window.TACTIC_SUPABASE_CONFIG?.isConfigured?.());
  }

  function initClient() {
    if (!isConfigured() || !window.supabase?.createClient) return null;
    if (!state.client) {
      const config = window.TACTIC_SUPABASE_CONFIG;
      state.client = window.supabase.createClient(config.url, config.anonKey);
    }
    return state.client;
  }

  function normalizeStatus(status) {
    return VALID_STATUSES.has(status) ? status : 'offline';
  }

  function statusLabel(status) {
    const normalized = normalizeStatus(status);
    if (normalized === 'in_match') return 'In Match';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function effectiveStatus(record) {
    if (!record) return 'offline';
    const lastSeen = new Date(record.last_seen || record.updated_at || 0).getTime();
    if (!lastSeen || Date.now() - lastSeen > OFFLINE_AFTER_MS) return 'offline';
    return normalizeStatus(record.status);
  }

  function keyFor(username) {
    return String(username || '').trim().toLowerCase();
  }

  function remember(record) {
    if (!record?.username) return;
    state.records.set(keyFor(record.username), record);
  }

  function updateDot(dot, label, status) {
    if (!dot || !label) return;
    const normalized = normalizeStatus(status);
    dot.className = `presence-dot ${normalized.replace('_', '-')}`;
    label.textContent = statusLabel(normalized);
  }

  function renderSelf() {
    const record = state.username ? state.records.get(keyFor(state.username)) : null;
    const status = effectiveStatus(record || {
      status: state.status,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    updateDot(elements.sessionPresenceDot, elements.sessionPresenceLabel, status);
    updateDot(elements.multiplayerSetupPresenceDot, elements.multiplayerSetupPresenceLabel, status);
    updateDot(elements.multiplayerYouPresenceDot, elements.multiplayerYouPresenceLabel, status);
  }

  function renderOpponent() {
    const opponentName = elements.multiplayerOpponentName?.textContent || '';
    const record = state.records.get(keyFor(opponentName));
    const status = opponentName && opponentName !== 'Waiting...' ? effectiveStatus(record) : 'searching';
    updateDot(elements.multiplayerOpponentPresenceDot, elements.multiplayerOpponentPresenceLabel, status);
  }

  function renderPresence() {
    cacheElements();
    renderSelf();
    renderOpponent();
  }

  async function fetchPresence() {
    const client = initClient();
    if (!client) return;

    const { data, error } = await client
      .from('user_presence')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) return;
    (data || []).forEach(remember);
    renderPresence();
  }

  async function findCurrentRecord() {
    const client = initClient();
    if (!client || !state.username) return null;

    let query = client.from('user_presence').select('*').limit(1);
    if (state.userId) {
      query = query.eq('user_id', state.userId);
    } else {
      query = query.eq('username', state.username);
    }

    const { data } = await query;
    return data?.[0] || null;
  }

  async function writePresence(status, roomId = state.currentRoomId) {
    state.status = normalizeStatus(status);
    state.currentRoomId = roomId || null;
    const client = initClient();
    if (!client || !state.username) {
      renderPresence();
      return null;
    }

    const now = new Date().toISOString();

    const existing = state.rowId ? { id: state.rowId } : await findCurrentRecord();
    const payload = {
      user_id: state.userId || null,
      username: state.username,
      status: state.status,
      current_room_id: state.currentRoomId,
      last_seen: now,
      updated_at: now,
    };

    const request = existing?.id
      ? client.from('user_presence').update(payload).eq('id', existing.id).select().single()
      : client.from('user_presence').insert(payload).select().single();

    const { data, error } = await request;
    if (!error && data) {
      state.rowId = data.id;
      remember(data);
      renderPresence();
    }
    return data || null;
  }

  function startHeartbeat() {
    if (state.heartbeatTimer) window.clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = window.setInterval(() => {
      if (state.username && state.status !== 'offline') {
        writePresence(state.status, state.currentRoomId);
      }
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    if (state.heartbeatTimer) window.clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }

  async function setUserOnline(username, userId = null) {
    state.username = String(username || '').trim();
    state.userId = userId || null;
    state.currentRoomId = null;
    await writePresence('online', null);
    startHeartbeat();
    subscribePresence();
  }

  async function setUserOffline() {
    if (state.username) await writePresence('offline', null);
    stopHeartbeat();
    state.status = 'offline';
    state.currentRoomId = null;
    renderPresence();
  }

  async function setUserSearching(username = state.username, userId = state.userId) {
    state.username = String(username || state.username || '').trim();
    state.userId = userId || state.userId || null;
    await writePresence('searching', null);
    startHeartbeat();
  }

  async function setUserInMatch(roomId) {
    await writePresence('in_match', roomId || null);
    startHeartbeat();
  }

  async function setUserOnlineAfterMatch() {
    await writePresence('online', null);
    startHeartbeat();
  }

  function subscribePresence() {
    const client = initClient();
    if (!client || state.channel) return;

    fetchPresence();
    state.channel = client
      .channel('user-presence-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_presence' },
        (payload) => {
          if (payload.new) remember(payload.new);
          renderPresence();
        },
      )
      .subscribe();
  }

  function markOfflineWithBeacon() {
    if (!state.username || !isConfigured()) return;
    const config = window.TACTIC_SUPABASE_CONFIG;
    const filter = state.rowId
      ? `id=eq.${encodeURIComponent(state.rowId)}`
      : `username=eq.${encodeURIComponent(state.username)}`;
    const url = `${config.url}/rest/v1/user_presence?${filter}`;
    const body = JSON.stringify({
      status: 'offline',
      current_room_id: null,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      fetch(url, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          apikey: config.anonKey,
          Authorization: `Bearer ${config.anonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body,
      });
    } catch (error) {
      // last_seen expiry is the fallback if unload delivery is blocked.
    }
  }

  window.addEventListener('beforeunload', markOfflineWithBeacon);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchPresence();
      if (state.username && state.status !== 'offline') writePresence(state.status, state.currentRoomId);
    }
  });

  window.TacTicPresence = {
    fetchPresence,
    renderPresence,
    setUserInMatch,
    setUserOffline,
    setUserOnline,
    setUserOnlineAfterMatch,
    setUserSearching,
    subscribePresence,
  };

  cacheElements();
  subscribePresence();
})();
