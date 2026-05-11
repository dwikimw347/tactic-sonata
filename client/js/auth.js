(() => {
  const AUTH_TOKEN_KEY = 'TACTIC_SONATA_AUTH_TOKEN';
  const API_BASE_URL = window.TACTIC_SONATA_API_BASE_URL || '';
  const AUTH_BASE = '/api/auth';

  const state = {
    user: null,
    token: window.localStorage.getItem(AUTH_TOKEN_KEY) || '',
    mode: 'login',
  };

  const elements = {};

  function getElement(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    [
      'authScreen',
      'titleScreen',
      'modeSelectScreen',
      'gameScreen',
      'multiplayerScreen',
      'userSessionBar',
      'sessionUsername',
      'logoutButton',
      'loginTabButton',
      'registerTabButton',
      'loginForm',
      'registerForm',
      'loginEmail',
      'loginPassword',
      'registerUsername',
      'registerEmail',
      'registerPassword',
      'registerConfirmPassword',
      'loginSubmitButton',
      'registerSubmitButton',
      'authMessage',
      'multiplayerUsernameInput',
    ].forEach((id) => {
      elements[id] = getElement(id);
    });
  }

  function setMessage(message = '', isError = false) {
    if (!elements.authMessage) return;
    elements.authMessage.textContent = message;
    elements.authMessage.classList.toggle('error', Boolean(isError));
  }

  function setLoading(isLoading) {
    if (elements.loginSubmitButton) elements.loginSubmitButton.disabled = isLoading;
    if (elements.registerSubmitButton) elements.registerSubmitButton.disabled = isLoading;
  }

  function hideGameScreens() {
    ['titleScreen', 'modeSelectScreen', 'gameScreen', 'multiplayerScreen'].forEach((id) => {
      const screen = elements[id];
      if (screen) screen.hidden = true;
    });
  }

  function showAuth() {
    hideGameScreens();
    if (elements.authScreen) elements.authScreen.hidden = false;
    if (elements.userSessionBar) elements.userSessionBar.hidden = true;
  }

  function showTitle() {
    if (elements.authScreen) elements.authScreen.hidden = true;
    if (elements.titleScreen) elements.titleScreen.hidden = false;
    if (elements.userSessionBar) elements.userSessionBar.hidden = false;
  }

  function updateSessionUi() {
    if (elements.sessionUsername) {
      elements.sessionUsername.textContent = state.user?.username || 'Player';
    }
    if (elements.userSessionBar) {
      elements.userSessionBar.hidden = !state.user;
    }
    if (elements.multiplayerUsernameInput && state.user?.username && !elements.multiplayerUsernameInput.value) {
      elements.multiplayerUsernameInput.value = state.user.username;
    }
  }

  function setAuthMode(mode) {
    state.mode = mode === 'register' ? 'register' : 'login';
    const isRegister = state.mode === 'register';
    elements.loginTabButton?.classList.toggle('active', !isRegister);
    elements.registerTabButton?.classList.toggle('active', isRegister);
    if (elements.loginForm) elements.loginForm.hidden = isRegister;
    if (elements.registerForm) elements.registerForm.hidden = !isRegister;
    elements.loginForm?.classList.toggle('hidden', isRegister);
    elements.registerForm?.classList.toggle('hidden', !isRegister);
    setMessage('');
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  }

  function validateRegister() {
    const username = elements.registerUsername?.value.trim() || '';
    const email = elements.registerEmail?.value.trim() || '';
    const password = elements.registerPassword?.value || '';
    const confirmPassword = elements.registerConfirmPassword?.value || '';

    if (username.length < 3) return 'Username must be at least 3 characters.';
    if (!isValidEmail(email)) return 'Please enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Confirm password must match password.';
    return '';
  }

  function validateLogin() {
    const email = elements.loginEmail?.value.trim() || '';
    const password = elements.loginPassword?.value || '';

    if (!isValidEmail(email)) return 'Please enter a valid email address.';
    if (!password) return 'Password is required.';
    return '';
  }

  async function authRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${AUTH_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      throw new Error(payload?.message || 'Authentication request failed.');
    }
    return payload.data || {};
  }

  function saveSession({ token, user }) {
    state.token = token || state.token;
    state.user = user || state.user;
    if (state.token) window.localStorage.setItem(AUTH_TOKEN_KEY, state.token);
    window.TacTicAuth.user = state.user;
    window.TacTicAuth.token = state.token;
    updateSessionUi();
    if (state.user?.username) {
      window.TacTicPresence?.setUserOnline?.(state.user.username, state.user.id);
    }
  }

  function clearSession() {
    state.user = null;
    state.token = '';
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.TacTicAuth.user = null;
    window.TacTicAuth.token = '';
    updateSessionUi();
  }

  async function handleLogin(event) {
    event.preventDefault();
    const validationError = validateLogin();
    if (validationError) {
      setMessage(validationError, true);
      return;
    }

    setLoading(true);
    setMessage('Opening the crimson hall...');
    try {
      const data = await authRequest('/login', {
        method: 'POST',
        body: JSON.stringify({
          email: elements.loginEmail.value.trim(),
          password: elements.loginPassword.value,
        }),
      });
      saveSession(data);
      setMessage('');
      showTitle();
    } catch (error) {
      setMessage(error.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const validationError = validateRegister();
    if (validationError) {
      setMessage(validationError, true);
      return;
    }

    setLoading(true);
    setMessage('Writing thy name into the register...');
    try {
      const data = await authRequest('/register', {
        method: 'POST',
        body: JSON.stringify({
          username: elements.registerUsername.value.trim(),
          email: elements.registerEmail.value.trim(),
          password: elements.registerPassword.value,
          confirmPassword: elements.registerConfirmPassword.value,
        }),
      });
      saveSession(data);
      setMessage('');
      showTitle();
    } catch (error) {
      setMessage(error.message, true);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      if (state.token) {
        await authRequest('/logout', { method: 'POST' });
      }
    } catch (error) {
      // Logout is client-authoritative for this stateless JWT flow.
    }
    await window.TacTicPresence?.setUserOffline?.();
    clearSession();
    showAuth();
  }

  async function restoreSession() {
    if (!state.token) {
      clearSession();
      showAuth();
      return;
    }

    setMessage('Restoring thy session...');
    try {
      const data = await authRequest('/me');
      saveSession({ user: data.user, token: state.token });
      setMessage('');
      showTitle();
    } catch (error) {
      clearSession();
      setMessage('Session expired. Please login again.', true);
      showAuth();
    }
  }

  function bindEvents() {
    elements.loginTabButton?.addEventListener('click', () => {
      window.playClickSfx?.();
      setAuthMode('login');
    });
    elements.registerTabButton?.addEventListener('click', () => {
      window.playClickSfx?.();
      setAuthMode('register');
    });
    elements.loginForm?.addEventListener('submit', handleLogin);
    elements.registerForm?.addEventListener('submit', handleRegister);
    elements.logoutButton?.addEventListener('click', () => {
      window.playClickSfx?.();
      window.TacTicStopModeAudio?.();
      logout();
    });
  }

  function getUser() {
    return state.user;
  }

  function getToken() {
    return state.token;
  }

  window.TacTicAuth = {
    getToken,
    getUser,
    logout,
    token: state.token,
    user: state.user,
  };

  cacheElements();
  bindEvents();
  setAuthMode('login');
  restoreSession();
})();
