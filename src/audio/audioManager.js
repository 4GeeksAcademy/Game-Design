// Central audio engine for Wild Cards.
// All sound profiles are kept here so recorded files can replace the
// synthesized prototypes later without changing game components.

const STORAGE_KEY = "wild-cards-audio-settings";
const DEFAULTS = { master: 0.75, music: 0.3, effects: 0.65, voices: 0.8, muted: false };

let audioContext = null;
let masterGain = null;
let musicGain = null;
// MUSIC LIBRARY: add tracks here; both battle modes share BATTLE_MUSIC_TRACKS.
// Story Mode uses its own STORY_MUSIC_TRACKS list. Keep files in public/audio/music/.
// BPM is editable track metadata (not automatic audio analysis). Set it to the
// song's measured tempo; the beat clock uses 60 / BPM seconds per beat.
const MUSIC_BASE = `${import.meta.env.BASE_URL}audio/music/`;

// Central music registry. Every id is unique, and every entry owns its BPM.
// Change bpm here when you measure a song's real tempo. The animation clock
// automatically reads the BPM belonging to whichever id is currently playing.
export const MENU_MUSIC_TRACKS = [
  { id: "main-menu", title: "Main Menu", file: `${MUSIC_BASE}17. Duelist (Instrumental).mp3`, bpm: 75 },
];

export const CHARACTER_SELECT_MUSIC_TRACKS = [
  { id: "character-select-main", title: "Character Select", file: `${MUSIC_BASE}menu-theme.mp3`, bpm: 120 },
];

export const BATTLE_MUSIC_TRACKS = [
  { id: "battle-main", title: "Stage 2", file: `${MUSIC_BASE}battle-1v1.mp3`, bpm: 140 },
];

export const STORY_MUSIC_TRACKS = [
  { id: "story-main", title: "Peaceful Days", file: `${MUSIC_BASE}story-theme.mp3`, bpm: 96 },
];

// Dialogue-specific moods use unique IDs. Add a new MP3 and entry here,
// then reference its id from a dialogue line's musicTrackId property.
export const STORY_DIALOGUE_MUSIC_TRACKS = [
  { id: "story-training", title: "Story — Training", file: `${MUSIC_BASE}battle-1v1.mp3`, bpm: 140 },
  { id: "story-light", title: "Story — Playful", file: `${MUSIC_BASE}menu-theme.mp3`, bpm: 120 },
  { id: "story-adventure-naruto", title: "Story — Adventure", file: `${MUSIC_BASE}Naruto Shippuden OP 10 - Newsong [8-bit cover].mp3`, bpm: 128 },
  { id: "story-wonder-naruto", title: "Story — Wonder", file: `${MUSIC_BASE}Naruto Ending 1 (Wind) 8 bit.mp3`, bpm: 55 },
  { id: "story-RockLee-theme", title: "Story — Rock Lee's Theme", file: `${MUSIC_BASE}Rock Lee's Theme.mp3`, bpm: 120 },
];

export const VICTORY_MUSIC_TRACKS = [
  { id: "victory-main", title: "Victory", file: `${MUSIC_BASE}victory-theme.mp3`, bpm: 120 },
];

// Set an index to select a different song from each playlist.
const ACTIVE_TRACKS = { menu: 0, characterSelect: 0, battle: 0, story: 0, victory: 0 };
const MUSIC_PLAYLISTS = {
  menu: MENU_MUSIC_TRACKS,
  characterSelect: CHARACTER_SELECT_MUSIC_TRACKS,
  battle: BATTLE_MUSIC_TRACKS,
  story: STORY_MUSIC_TRACKS,
  victory: VICTORY_MUSIC_TRACKS,
};
const ALL_MUSIC_TRACKS = [
  ...MENU_MUSIC_TRACKS,
  ...CHARACTER_SELECT_MUSIC_TRACKS,
  ...BATTLE_MUSIC_TRACKS,
  ...STORY_MUSIC_TRACKS,
  ...STORY_DIALOGUE_MUSIC_TRACKS,
  ...VICTORY_MUSIC_TRACKS,
];
const MUSIC_TRACKS_BY_ID = Object.fromEntries(ALL_MUSIC_TRACKS.map((track) => [track.id, track]));

function normalizeMusicCategory(category) {
  if (category === "battle1v1" || category === "battle2v2") return "battle";
  return MUSIC_PLAYLISTS[category] ? category : "menu";
}

function getSelectedMusic(category) {
  const playlist = MUSIC_PLAYLISTS[category] || MUSIC_PLAYLISTS.menu;
  return playlist[ACTIVE_TRACKS[category] ?? 0] || playlist[0] || null;
}

let currentTrack = "menu";
let activeMusicTrack = null;
let audioElement = null;
let musicSuppressed = false;
let settings = loadSettings();
function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Storage is optional. */ }
}

function ensureAudio() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    musicGain = audioContext.createGain();
    musicGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
    applyVolumes();
  }
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function applyVolumes() {
  if (audioElement) audioElement.volume = settings.muted ? 0 : Math.max(0, Math.min(1, settings.master * settings.music));
  if (!audioContext || !masterGain || !musicGain) return;
  const now = audioContext.currentTime;
  masterGain.gain.setTargetAtTime(settings.muted ? 0 : settings.master, now, 0.04);
  musicGain.gain.setTargetAtTime(settings.music, now, 0.08);
}

function makeTone(frequency, duration, type = "sine", volume = 0.06, when = 0, destination = null, category = "effects") {
  const ctx = ensureAudio();
  if (!ctx || settings.muted || settings[category] <= 0) return;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + when;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * settings[category]), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(destination || masterGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

// Recorded files are the only background-music source. There is no synthesized
// fallback: a missing file must not silently revive the old prototype melody.
function attemptMusicPlayback(player) {
  if (!player || player !== audioElement || settings.muted || settings.music <= 0 || !player.paused) return;
  player.volume = Math.max(0, Math.min(1, settings.master * settings.music));
  const result = player.play();
  if (result && typeof result.catch === "function") {
    result.then(() => {
      if (player === audioElement && !player.paused && typeof document !== "undefined") {
        document.documentElement.classList.add("wc-rhythm-active");
      }
    }).catch(() => {
      // Autoplay may be blocked until the user interacts. Keep this player so
      // the AudioDirector can retry it on the next pointer or keyboard gesture.
    });
  }
}

function setTempoMetadata(track) {
  if (typeof document === "undefined") return;
  const bpm = Number(track?.bpm) > 0 ? Number(track.bpm) : 120;
  document.documentElement.style.setProperty("--wc-bpm", String(bpm));
  document.documentElement.style.setProperty("--wc-beat-duration", `${60 / bpm}s`);
  window.dispatchEvent(new CustomEvent("wildcards:musicchange", { detail: { bpm, trackId: track?.id } }));
}

function playMusicTrack(track, category = "story") {
  if (!track?.file) return;
  musicSuppressed = false;
  currentTrack = category;
  activeMusicTrack = track;
  setTempoMetadata(track);

  if (settings.muted || settings.music <= 0 || typeof Audio === "undefined") {
    stopMusic();
    return;
  }
  if (
    audioElement &&
    audioElement.dataset.trackId === track.id &&
    audioElement.src === new URL(track.file, window.location.href).href &&
    !audioElement.paused
  ) {
    return;
  }

  stopMusic();

  const player = new Audio(track.file);
  player.dataset.trackId = track.id;
  player.preload = "auto";
  player.loop = category !== "victory";
  player.volume = Math.max(0, Math.min(1, settings.master * settings.music));
  player.addEventListener("canplay", () => attemptMusicPlayback(player));
  player.addEventListener("error", () => {
    if (audioElement === player) audioElement = null;
    console.error("[Wild Cards Audio] Could not load music:", track.file);
  });
  audioElement = player;
  player.load();
}

export function startMusic(category = "menu") {
  const nextCategory = normalizeMusicCategory(category);
  const selectedTrack = getSelectedMusic(nextCategory);
  playMusicTrack(selectedTrack, nextCategory);
}

// Dialogue lines can request a specific mood by adding musicTrackId.
// The id is resolved here, keeping StoryCutscene independent of file paths.
export function startMusicById(trackId) {
  // A dialogue line can explicitly silence background music without needing
  // a dedicated audio asset or changing the active playlist.
  if (trackId === "none") {
    musicSuppressed = true;
    stopMusic();
    return true;
  }

  const track = MUSIC_TRACKS_BY_ID[trackId];
  if (!track) {
    console.warn(`[Wild Cards Audio] Unknown musicTrackId: ${trackId}`);
    return false;
  }

  const category = Object.entries(MUSIC_PLAYLISTS)
    .find(([, playlist]) => playlist.some((item) => item.id === trackId))?.[0] ?? "story";
  playMusicTrack(track, category);
  return true;
}

export function resumeMusic() {
  if (musicSuppressed) return;
  if (audioElement) {
    attemptMusicPlayback(audioElement);
    return;
  }
  if (activeMusicTrack) playMusicTrack(activeMusicTrack, currentTrack);
  else startMusic(currentTrack);
}

export function getMusicBeatInfo() {
  return {
    bpm: Number(activeMusicTrack?.bpm) > 0 ? Number(activeMusicTrack.bpm) : 120,
    currentTime: audioElement?.currentTime ?? 0,
    isPlaying: Boolean(audioElement && !audioElement.paused),
    trackId: activeMusicTrack?.id ?? null,
  };
}

export function stopMusic() {
  if (audioElement) {
    audioElement.pause();
    audioElement.removeAttribute("src");
    audioElement.load();
    audioElement = null;
  }
  if (typeof document !== "undefined") document.documentElement.classList.remove("wc-rhythm-active");
}

// Local, file-based sound effects bundled in public/audio/effects/.
const AUDIO_ASSETS = {
  click: `${import.meta.env.BASE_URL}audio/effects/ui-click.mp3`,
  attack: `${import.meta.env.BASE_URL}audio/effects/attack-impact.ogg`,
  purchase: `${import.meta.env.BASE_URL}audio/effects/purchase-coin.mp3`,
};

export function playGameSound(name) {
  const url = AUDIO_ASSETS[name];
  if (!url || typeof Audio === "undefined" || settings.muted || settings.effects <= 0) return;

  const player = new Audio(url);
  player.preload = "auto";
  player.volume = Math.max(0, Math.min(1, settings.master * settings.effects));
  player.play().catch(() => {
    // A blocked or unavailable external asset should never interrupt gameplay.
  });
}


// Strong arcade combo sting: every count raises the pitch and each sting
// itself climbs through a quick four-note fighting-game flourish.
// A separate victory-style flourish when a combo is broken. Each rating tier
// gets its own melodic signature so the end-of-combo sound is distinct from hits.
export function playComboBreakSound(comboCount = 3) {
  const count = Math.max(3, Math.min(10, Number(comboCount) || 3));
  const ctx = ensureAudio();
  if (!ctx || settings.muted || settings.effects <= 0) return;
  const tier = count >= 10 ? 3 : count >= 7 ? 2 : count >= 5 ? 1 : 0;
  const motifs = [
    [660, 784, 988],
    [740, 932, 1175, 1397],
    [587, 784, 1175, 1568],
    [784, 1047, 1319, 1760, 2093],
  ];
  const notes = motifs[tier];
  const play = () => {
    if (settings.muted || settings.effects <= 0 || !masterGain) return;
    const now = ctx.currentTime;
    notes.forEach((frequency, index) => {
      const start = now + index * (tier === 0 ? 0.105 : 0.085);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = tier === 0 ? "sine" : tier === 1 ? "triangle" : index % 2 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime((0.095 + tier * 0.025) * settings.effects, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (tier === 3 ? 0.42 : 0.32));
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(start);
      oscillator.stop(start + (tier === 3 ? 0.45 : 0.35));
    });
  };
  if (ctx.state === "suspended") ctx.resume().then(play).catch(() => {});
  else play();
}

export function playComboSound(comboCount = 3) {
  const count = Math.max(3, Math.min(10, Number(comboCount) || 3));
  const ctx = ensureAudio();
  if (!ctx || settings.muted || settings.effects <= 0) return;
  const level = count - 3;
  const base = 520 + level * 105;
  const notes = [base, base * 1.22, base * 1.5, base * 1.92];
  const play = () => {
    if (settings.muted || settings.effects <= 0 || !masterGain) return;
    const now = ctx.currentTime;
    notes.forEach((frequency, index) => {
      const start = now + index * 0.065;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = index === 0 ? "square" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime((0.16 + level * 0.012) * settings.master * settings.effects, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(start);
      oscillator.stop(start + 0.22);
    });
  };
  if (ctx.state === "suspended") ctx.resume().then(play).catch(() => {});
  else play();
}

// Loud, original arcade buzzer inspired by live elimination-show buzzers.
export function playAGTBuzzerSound() {
  const ctx = ensureAudio();
  if (!ctx || settings.muted || settings.effects <= 0 || !masterGain) return;

  const play = () => {
    if (settings.muted || settings.effects <= 0 || !masterGain) return;
    const now = ctx.currentTime;
    const buzzLayers = [
      { frequency: 118, delay: 0, duration: 0.56, volume: 0.15 },
      { frequency: 94, delay: 0.025, duration: 0.52, volume: 0.12 },
      { frequency: 72, delay: 0.075, duration: 0.44, volume: 0.10 },
    ];

    buzzLayers.forEach(({ frequency, delay, duration, volume }) => {
      const start = now + delay;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.78, start + duration);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * settings.effects), start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.035);
    });
  };

  if (ctx.state === "suspended") ctx.resume().then(play).catch(() => {});
  else play();
}

export function playUISound(kind = "click") {
  if (kind === "click") {
    playGameSound("click");
    return;
  }
  const sounds = {
    click: [620, 0.045, "square", 0.025],
    confirm: [784, 0.09, "triangle", 0.05],
    back: [440, 0.07, "triangle", 0.035],
    unlock: [988, 0.24, "sine", 0.065],
    hit: [125, 0.11, "sawtooth", 0.08],
    block: [280, 0.08, "square", 0.04],
    victory: [784, 0.16, "triangle", 0.06],
  };
  const [frequency, duration, type, volume] = sounds[kind] || sounds.click;
  makeTone(frequency, duration, type, volume);
  if (["confirm", "unlock", "victory"].includes(kind)) {
    makeTone(frequency * 1.25, duration * 0.8, "sine", volume * 0.6, 0.08);
  }
}

// Distinct typewriter timbres for each fighter. These are temporary synthesized
// voice textures until recorded character-specific clips are placed in public/audio.
const dialogueProfiles = {
  rockLee: { base: 440, type: "square", duration: 0.027, volume: 0.025, interval: 3 },
  tenten: { base: 690, type: "triangle", duration: 0.032, volume: 0.021, interval: 3 },
  narrator: { base: 420, type: "sine", duration: 0.025, volume: 0.014, interval: 4 },
  default: { base: 570, type: "triangle", duration: 0.028, volume: 0.018, interval: 3 },
};

export function getDialogueProfile(characterId) {
  return dialogueProfiles[characterId] || dialogueProfiles.default;
}

export function playDialogueBlip(characterId = "narrator") {
  const profile = getDialogueProfile(characterId);
  const variation = (Math.random() - 0.5) * 38;
  makeTone(profile.base + variation, profile.duration, profile.type, profile.volume, 0, null, "voices");
}

// Recorded CC0 character reactions. Each visible expression used in the
// current Rock Lee / Tenten story scenes has an explicit sound assignment.
// Replace any URL with a local /audio/voices/... MP3 later without changing
// StoryCutscene.jsx.
// Local character reaction clips in public/audio/voices/.
// Only map expressions that have a suitable recording. Missing expressions
// intentionally stay silent until a matching voice clip is added.
const VOICE_BASE = `${import.meta.env.BASE_URL}audio/voices/`;
const EXPRESSION_AUDIO = {
  rockLee: {
    happy: `${VOICE_BASE}rockLee/happy.wav`,
    excited: `${VOICE_BASE}rockLee/excited.wav`,
    serious: `${VOICE_BASE}rockLee/serious.wav`,
    pushups1: `${VOICE_BASE}rockLee/rocklee-pushups.wav`,
    pushups2: `${VOICE_BASE}rockLee/rocklee-pushups.wav`,
  },
  tenten: {
    happy: `${VOICE_BASE}tenten/TenTen-happy.wav`,
    angry: `${VOICE_BASE}tenten/tenten-angry.wav`,
    facepalm: `${VOICE_BASE}tenten/TenTen-facepalm.wav`,
    exasperated: `${VOICE_BASE}tenten/TenTen-facepalm.wav`,
  },
};

export function playCharacterExpression(characterId, expression) {
  const url = EXPRESSION_AUDIO[characterId]?.[expression];
  if (!url || typeof Audio === "undefined" || settings.muted || settings.voices <= 0) return;
  const player = new Audio(url);
  player.preload = "auto";
  player.volume = Math.max(0, Math.min(1, settings.master * settings.voices));
  player.play().catch(() => {
    // Keep the cutscene moving if a remote voice clip is temporarily unavailable.
  });
}

export function getAudioSettings() {
  return { ...settings };
}

export function updateAudioSettings(next) {
  settings = { ...settings, ...next };
  saveSettings();
  applyVolumes();
  if (settings.muted || settings.music <= 0) stopMusic();
  else if (activeMusicTrack) playMusicTrack(activeMusicTrack, currentTrack);
  else if (!musicSuppressed) startMusic(currentTrack);
  return getAudioSettings();
}

export function initializeAudio() {
  ensureAudio();
}
