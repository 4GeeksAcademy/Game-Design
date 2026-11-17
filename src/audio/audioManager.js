// Central audio controls for Wild Cards.
// Replace these Web Audio-generated sounds with files in public/audio later
// without changing the components that call this module.

const STORAGE_KEY = "wild-cards-audio-settings";
const DEFAULTS = { master: 0.7, music: 0.22, effects: 0.55, muted: false };

let context = null;
let masterGain = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Audio still works when storage is unavailable.
  }
}

function ensureAudio() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!context) {
    context = new AudioContextClass();
    masterGain = context.createGain();
    musicGain = context.createGain();
    musicGain.connect(masterGain);
    masterGain.connect(context.destination);
    applyVolumes();
  }
  if (context.state === "suspended") context.resume().catch(() => {});
  return context;
}

function applyVolumes() {
  if (!context || !masterGain || !musicGain) return;
  const now = context.currentTime;
  masterGain.gain.setTargetAtTime(settings.muted ? 0 : settings.master, now, 0.04);
  musicGain.gain.setTargetAtTime(settings.music, now, 0.08);
}

function tone(frequency, duration, type = "sine", volume = 0.08, destination = null, when = 0) {
  const audio = ensureAudio();
  if (!audio || settings.muted || settings.effects <= 0) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime + when;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * settings.effects), start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(destination || masterGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

const progressions = {
  menu: [ [110, 138.59, 164.81], [98, 123.47, 146.83], [130.81, 164.81, 196], [87.31, 110, 130.81] ],
  story: [ [130.81, 155.56, 196], [110, 130.81, 164.81], [98, 123.47, 146.83], [116.54, 146.83, 174.61] ],
  battle: [ [73.42, 110, 146.83], [82.41, 123.47, 164.81], [65.41, 98, 130.81], [87.31, 130.81, 174.61] ],
  victory: [ [130.81, 164.81, 196], [146.83, 185, 220], [164.81, 196, 246.94], [146.83, 185, 220] ],
};

function playMusicStep() {
  if (!context || settings.muted || settings.music <= 0) return;
  const progression = progressions[currentTrack] || progressions.menu;
  const chord = progression[Math.floor(musicStep / 4) % progression.length];
  const note = chord[musicStep % 3];
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(note, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.7);
  gain.gain.setTargetAtTime(0.0001, now + 2.2, 0.4);
  oscillator.connect(gain);
  gain.connect(musicGain);
  oscillator.start(now);
  oscillator.stop(now + 4.2);
  musicStep += 1;
}

export function startMusic(track = "menu") {
  ensureAudio();
  if (currentTrack !== track) {
    currentTrack = track;
    musicStep = 0;
  }
  if (!context || musicTimer) return;
  playMusicStep();
  musicTimer = window.setInterval(playMusicStep, 3000);
}

export function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
}

export function playUISound(kind = "click") {
  const sounds = {
    click: [520, 0.055, "square", 0.035],
    confirm: [740, 0.1, "triangle", 0.06],
    back: [330, 0.08, "triangle", 0.045],
    unlock: [880, 0.28, "sine", 0.07],
    hit: [115, 0.12, "sawtooth", 0.09],
    block: [245, 0.09, "square", 0.045],
    victory: [660, 0.18, "triangle", 0.07],
  };
  const [frequency, duration, type, volume] = sounds[kind] || sounds.click;
  tone(frequency, duration, type, volume);
  if (kind === "confirm" || kind === "unlock" || kind === "victory") {
    tone(frequency * 1.25, duration * 0.8, "sine", volume * 0.65, null, 0.09);
  }
}

export function playDialogueBlip(characterId = "") {
  // Slight pitch variation keeps the typewriter voice from sounding robotic.
  const seed = String(characterId).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const pitch = 390 + (seed % 7) * 24 + Math.random() * 18;
  tone(pitch, 0.035, "square", 0.018);
}

export function getAudioSettings() {
  return { ...settings };
}

export function updateAudioSettings(next) {
  settings = { ...settings, ...next };
  saveSettings();
  applyVolumes();
  if (settings.muted || settings.music <= 0) stopMusic();
  else if (!musicTimer && context) startMusic(currentTrack);
  return getAudioSettings();
}

export function initializeAudio() {
  ensureAudio();
}
