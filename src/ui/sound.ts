// Music and sounds made in code with Web Audio: no files to load.
import { Act } from '../game/catalog';

let ctx: AudioContext | null = null;
let muted = false;
let musicTimer: ReturnType<typeof setTimeout> | null = null;

/** Browsers only allow sound after a tap, so the context starts on the first one. */
function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, to: number, dur: number, type: OscillatorType, vol = 0.18, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, from: number, to: number, vol = 0.12, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

const notes = (list: number[], gap: number, type: OscillatorType = 'triangle', vol = 0.16) =>
  list.forEach((f, i) => tone(f, f, gap * 1.6, type, vol, i * gap));

export const sfx = {
  pop: () => tone(500, 1000, 0.09, 'sine'),
  nope: () => tone(260, 180, 0.18, 'triangle', 0.1),
  ding: () => { tone(880, 880, 0.5, 'sine', 0.2); tone(659, 659, 0.7, 'sine', 0.2, 0.32); },
  giggle: () => [700, 900, 760, 980, 820].forEach((f, i) => tone(f, f * 1.15, 0.07, 'sine', 0.12, i * 0.08)),
  sparkle: () => notes([1047, 1319, 1568, 2093], 0.07, 'triangle', 0.12),
  slurp: () => { noise(0.35, 400, 1600, 0.1); tone(300, 600, 0.3, 'sine', 0.06); },
  crunch: () => [0, 0.12, 0.24].forEach((d) => noise(0.08, 1800, 900, 0.14, d)),
  flush: () => noise(0.9, 2500, 300, 0.12),
  lullaby: () => notes([784, 659, 523, 659, 784], 0.18, 'sine', 0.12),
  page: () => noise(0.18, 3000, 6000, 0.08),
  tune: () => notes([523, 523, 784, 784, 880, 880, 784], 0.13),
  cheer: () => notes([523, 659, 784, 1047, 784, 1047], 0.12),
};

const ACT_SOUND: Record<Act, () => void> = {
  bottle: sfx.slurp, nappy: sfx.giggle, nap: sfx.lullaby, cuddle: sfx.giggle, snack: sfx.crunch, blocks: sfx.pop,
  song: sfx.tune, painting: sfx.sparkle, dressup: sfx.sparkle, story: sfx.page, outside: sfx.giggle, potty: sfx.flush, play: sfx.giggle,
};
export const actSound = (a: Act) => ACT_SOUND[a]();

// A gentle music-box tune on a loop: C major, soft sine notes.
const TUNE: [number, number][] = [
  [523, 1], [659, 1], [784, 1], [659, 1], [698, 1], [880, 1], [784, 2],
  [659, 1], [587, 1], [523, 1], [587, 1], [659, 1], [587, 1], [523, 2],
];
const BEAT = 0.42;

function playTune() {
  const a = audio();
  if (!a) return;
  let at = 0;
  for (const [f, b] of TUNE) {
    tone(f, f, b * BEAT * 1.8, 'sine', 0.045, at);
    tone(f / 2, f / 2, b * BEAT * 1.8, 'sine', 0.02, at);
    at += b * BEAT;
  }
  musicTimer = setTimeout(playTune, (at + BEAT * 4) * 1000);
}

let musicOn = false;

/** Called from a tap (Play), since browsers block sound before one. */
export function startMusic() {
  musicOn = true;
  if (musicTimer || muted) return;
  playTune();
}

export function setMuted(m: boolean) {
  muted = m;
  if (m && musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  if (!m && musicOn) startMusic();
}
