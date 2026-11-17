// Central audio engine for Wild Cards.
// All sound profiles are kept here so recorded files can replace the
// synthesized prototypes later without changing game components.

const STORAGE_KEY = "wild-cards-audio-settings";
const DEFAULTS = { master: 0.75, music: 0.3, effects: 0.65, voices: 0.8, muted: false };

let audioContext = null;
let masterGain = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;
let audioElement = null;
const MUSIC_FILES = {
  menu: "/audio/music/menu-theme.mp3",
  story: "/audio/music/story-theme.mp3",
  battle1v1: "/audio/music/battle-1v1.mp3",
  battle2v2: "/audio/music/battle-2v2.mp3",
  victory: "/audio/music/victory-theme.mp3",
};
let currentTrack = "menu";
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
  if (!audioContext || !masterGain || !musicGain) return;
  const now = audioContext.currentTime;
  masterGain.gain.setTargetAtTime(settings.muted ? 0 : settings.master, now, 0.04);
  musicGain.gain.setTargetAtTime(settings.music, now, 0.08);
  if (audioElement) audioElement.volume = settings.muted ? 0 : Math.max(0, Math.min(1, settings.master * settings.music));
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

// Bright, major-key arcade phrases instead of the previous ominous drone.
// The patterns are deliberately short prototypes: replace with custom music later.
const musicPatterns = {
  menu: {
    bpm: 112,
    notes: [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 523.25, 659.25, 783.99, 1046.5, 880, 783.99, 698.46, 659.25],
    bass: [130.81, 164.81, 196, 164.81],
  },
  story: {
    bpm: 92,
    notes: [392, 493.88, 587.33, 493.88, 440, 523.25, 659.25, 523.25, 392, 440, 523.25, 587.33],
    bass: [98, 130.81, 146.83, 130.81],
  },
  battle1v1: {
    bpm: 132,
    notes: [392, 523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 783.99, 659.25, 523.25, 659.25, 587.33, 783.99, 880, 1046.5],
    bass: [98, 98, 130.81, 146.83],
  },
  battle2v2: {
    bpm: 146,
    notes: [329.63, 392, 493.88, 587.33, 659.25, 587.33, 493.88, 392, 349.23, 440, 523.25, 659.25, 698.46, 659.25, 587.33, 493.88],
    bass: [82.41, 110, 130.81, 110],
  },
  victory: {
    bpm: 120,
    notes: [523.25, 659.25, 783.99, 1046.5, 783.99, 880, 1046.5, 1318.51],
    bass: [130.81, 164.81, 196, 261.63],
  },
};

function playMusicStep() {
  const ctx = audioContext;
  if (!ctx || settings.muted || settings.music <= 0) return;
  const pattern = musicPatterns[currentTrack] || musicPatterns.menu;
  const index = musicStep % pattern.notes.length;
  const now = ctx.currentTime;
  const beat = 60 / pattern.bpm / 2;
  const melody = ctx.createOscillator();
  const melodyGain = ctx.createGain();
  melody.type = "triangle";
  melody.frequency.setValueAtTime(pattern.notes[index], now);
  melodyGain.gain.setValueAtTime(0.0001, now);
  melodyGain.gain.linearRampToValueAtTime(0.075, now + 0.018);
  melodyGain.gain.exponentialRampToValueAtTime(0.0001, now + beat * 0.82);
  melody.connect(melodyGain);
  melodyGain.connect(musicGain);
  melody.start(now);
  melody.stop(now + beat);

  if (musicStep % 2 === 0) {
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = "triangle";
    bass.frequency.setValueAtTime(pattern.bass[Math.floor(musicStep / 2) % pattern.bass.length], now);
    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.linearRampToValueAtTime(0.11, now + 0.015);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + beat * 1.7);
    bass.connect(bassGain);
    bassGain.connect(musicGain);
    bass.start(now);
    bass.stop(now + beat * 1.8);
  }
  musicStep += 1;
}

function startSynthMusic() {
  if (!audioContext || musicTimer || settings.muted || settings.music <= 0) return;
  playMusicStep();
  const pattern = musicPatterns[currentTrack] || musicPatterns.menu;
  musicTimer = window.setInterval(playMusicStep, (60 / pattern.bpm / 2) * 1000);
}

export function startMusic(track = "menu") {
  ensureAudio();
  if (currentTrack !== track) {
    stopMusic();
    currentTrack = track;
    musicStep = 0;
  }
  if (settings.muted || settings.music <= 0 || audioElement || musicTimer) return;

  const filePath = MUSIC_FILES[currentTrack];
  if (filePath && typeof Audio !== "undefined") {
    const player = new Audio(filePath);
    player.loop = true;
    player.volume = Math.max(0, Math.min(1, settings.master * settings.music));
    player.oncanplay = () => {
      if (audioElement === player) player.play().catch(() => {
        if (audioElement === player) {
          audioElement = null;
          startSynthMusic();
        }
      });
    };
    player.onerror = () => {
      if (audioElement === player) {
        audioElement = null;
        startSynthMusic();
      }
    };
    audioElement = player;
    player.load();
    return;
  }

  startSynthMusic();
}

export function stopMusic() {
  if (musicTimer && typeof window !== "undefined") window.clearInterval(musicTimer);
  musicTimer = null;
  if (audioElement) {
    audioElement.pause();
    audioElement.removeAttribute("src");
    audioElement.load();
    audioElement = null;
  }
}

export function playUISound(kind = "click") {
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
  else if (audioContext && !musicTimer) startMusic(currentTrack);
  return getAudioSettings();
}

export function initializeAudio() {
  ensureAudio();
}
