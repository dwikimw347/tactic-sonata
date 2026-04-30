(() => {
  const BGM_VOLUME = 0.3;
  const SFX_VOLUME = 0.4;

  const state = {
    muted: false,
    bgMusic: null,
    clickSfx: null,
  };

  function createTrack(src, loop, volume) {
    const track = new Audio(src);
    track.loop = loop;
    track.volume = volume;
    track.preload = "auto";
    track.addEventListener("error", () => {
      track.dataset.available = "false";
    });
    track.dataset.available = "true";
    return track;
  }

  function ensureAudio() {
    if (!state.bgMusic) {
      state.bgMusic = createTrack("assets/audio/background.wav", true, BGM_VOLUME);
    }

    if (!state.clickSfx) {
      state.clickSfx = createTrack("assets/audio/click.wav", false, SFX_VOLUME);
    }
  }

  function playMultiplayerMusic() {
    ensureAudio();
    if (state.muted || state.bgMusic.dataset.available === "false") return;

    state.bgMusic.loop = true;
    state.bgMusic.volume = BGM_VOLUME;
    if (state.bgMusic.paused) {
      state.bgMusic.play().catch(() => undefined);
    }
  }

  function pauseMultiplayerMusic() {
    if (!state.bgMusic) return;
    state.bgMusic.pause();
  }

  function playClick() {
    ensureAudio();
    if (state.muted || state.clickSfx.dataset.available === "false") return;

    try {
      state.clickSfx.currentTime = 0;
      state.clickSfx.volume = SFX_VOLUME;
      state.clickSfx.play().catch(() => undefined);
    } catch (error) {
      state.clickSfx.dataset.available = "false";
    }
  }

  function setMuted(value) {
    state.muted = Boolean(value);
    if (state.muted) {
      pauseMultiplayerMusic();
    } else {
      playMultiplayerMusic();
    }
    return state.muted;
  }

  function toggleMuted() {
    return setMuted(!state.muted);
  }

  window.TacTicAudio = {
    playMultiplayerMusic,
    pauseMultiplayerMusic,
    playClick,
    setMuted,
    toggleMuted,
    isMuted: () => state.muted,
  };
})();
