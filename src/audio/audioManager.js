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
const MUSIC_BASE = `${import.meta.env.BASE_URL}audio/music/`;

export const MENU_MUSIC_TRACKS = [
  { id: "main-menu", title: "Main Menu", file: `${MUSIC_BASE}menu-theme.mp3` },
];

export const BATTLE_MUSIC_TRACKS = [
  { id: "battle-main", title: "Stage 2", file: `${MUSIC_BASE}battle-1v1.mp3` },
];

export const STORY_MUSIC_TRACKS = [
  { id: "story-main", title: "Peaceful Days", file: `${MUSIC_BASE}story-theme.mp3` },
];

export const VICTORY_MUSIC_TRACKS = [
  { id: "victory-main", title: "Victory", file: `${MUSIC_BASE}victory-theme.mp3` },
];

// Set an index to select a different song from each playlist.
const ACTIVE_TRACKS = { menu: 0, battle: 0, story: 0, victory: 0 };
const MUSIC_PLAYLISTS = { menu: MENU_MUSIC_TRACKS, battle: BATTLE_MUSIC_TRACKS, story: STORY_MUSIC_TRACKS, victory: VICTORY_MUSIC_TRACKS };

function normalizeMusicCategory(category) {
  if (category === "battle1v1" || category === "battle2v2") return "battle";
  return MUSIC_PLAYLISTS[category] ? category : "menu";
}

function getSelectedMusic(category) {
  const playlist = MUSIC_PLAYLISTS[category] || MUSIC_PLAYLISTS.menu;
  return playlist[ACTIVE_TRACKS[category] ?? 0] || playlist[0] || null;
}

let currentTrack = "menu";
let audioElement = null;
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
    result.catch(() => {
      // Autoplay may be blocked until the user interacts. Keep this player so
      // the AudioDirector can retry it on the next pointer or keyboard gesture.
    });
  }
}

export function startMusic(category = "menu") {
  const nextCategory = normalizeMusicCategory(category);
  const selectedTrack = getSelectedMusic(nextCategory);
  if (!selectedTrack?.file || settings.muted || settings.music <= 0) return;

  if (currentTrack !== nextCategory || (audioElement && audioElement.dataset.trackId !== selectedTrack.id)) {
    stopMusic();
    currentTrack = nextCategory;
  }
  if (audioElement) {
    attemptMusicPlayback(audioElement);
    return;
  }
  if (typeof Audio === "undefined") return;

  const player = new Audio(selectedTrack.file);
  player.dataset.trackId = selectedTrack.id;
  player.preload = "auto";
  player.loop = nextCategory !== "victory";
  player.volume = Math.max(0, Math.min(1, settings.master * settings.music));
  player.addEventListener("canplay", () => attemptMusicPlayback(player));
  player.addEventListener("error", () => {
    if (audioElement === player) audioElement = null;
    // Never replace a missing MP3 with synthesized prototype music.
  });
  audioElement = player;
  player.load();
}

export function stopMusic() {
  if (!audioElement) return;
  audioElement.pause();
  audioElement.removeAttribute("src");
  audioElement.load();
  audioElement = null;
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
  rockLee: { base: 510, type: "square", duration: 0.027, volume: 0.025, interval: 3 },
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

// One-shot reactions tied to expression changes. File-backed clips can replace
// these synth prototypes while keeping the same character/expression keys.
const genericExpressionProfiles = {
  happy: { notes: [740, 880], duration: 0.075, type: "triangle" },
  excited: { notes: [660, 880, 990], duration: 0.065, type: "square" },
  angry: { notes: [220, 165], duration: 0.09, type: "square" },
  determined: { notes: [392, 494], duration: 0.09, type: "triangle" },
  serious: { notes: [330], duration: 0.1, type: "sine" },
  relate: { notes: [587, 659], duration: 0.08, type: "triangle" },
  facepalm: { notes: [392, 330], duration: 0.12, type: "sine" },
  exasperated: { notes: [330, 294], duration: 0.13, type: "sine" },
  pushups1: { notes: [145, 115], duration: 0.12, type: "sawtooth" },
  pushups2: { notes: [125, 95], duration: 0.14, type: "sawtooth" },
};

const expressionProfiles = {
  rockLee: {
    happy: { notes: [784, 988], duration: 0.075, type: "triangle" },
    excited: { notes: [659, 880, 1175], duration: 0.065, type: "square" },
    determined: { notes: [392, 523], duration: 0.09, type: "triangle" },
    serious: { notes: [330], duration: 0.1, type: "sine" },
    pushups1: { notes: [145, 115], duration: 0.12, type: "sawtooth" },
    pushups2: { notes: [125, 95], duration: 0.14, type: "sawtooth" },
    angry: { notes: [185, 140], duration: 0.09, type: "square" },
  },
  tenten: {
    happy: { notes: [880, 1046], duration: 0.07, type: "triangle" },
    angry: { notes: [260, 220], duration: 0.09, type: "square" },
    exasperated: { notes: [330, 294], duration: 0.13, type: "sine" },
    facepalm: { notes: [392, 330], duration: 0.12, type: "sine" },
    relate: { notes: [587, 659], duration: 0.08, type: "triangle" },
    neutral: { notes: [440], duration: 0.045, type: "sine" },
  },
};

export function playCharacterExpression(characterId, expression) {
  const profile = expressionProfiles[characterId]?.[expression] || genericExpressionProfiles[expression];
  if (!profile) return;
  const characterSeed = String(characterId || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const characterPitch = 1 + ((characterSeed % 9) - 4) * 0.012;
  profile.notes.forEach((note, index) => {
    makeTone(note * characterPitch, profile.duration, profile.type, 0.035, index * 0.075, null, "voices");
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
  else startMusic(currentTrack);
  return getAudioSettings();
}

export function initializeAudio() {
  ensureAudio();
}
