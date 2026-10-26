/**
 * Sound effects, synthesized with the Web Audio API (no audio files).
 */

let audioCtx: AudioContext | null = null;
const unlockWaiters: (() => void)[] = [];

// Starting audio outside a tap or key press only makes the browser log a warning.
// Browsers without navigator.userActivation just try.
const canStartAudio = () => (navigator as { userActivation?: { isActive: boolean } }).userActivation?.isActive ?? true;

/** The shared audio context, or null until the first tap or key press (browsers block audio before that). */
export function getAudioContext(): AudioContext | null {
  if (audioCtx?.state === 'suspended' && canStartAudio()) audioCtx.resume().catch(() => {});
  return audioCtx;
}

/** Runs `fn` once audio is allowed to play */
export function whenAudioUnlocked(fn: () => void): void {
  if (audioCtx?.state === 'running') fn();
  else unlockWaiters.push(fn);
}

// Browsers keep audio locked until the first tap/key press. A touch only counts when the
// finger lifts, so listen to both pointer events and keep listening until audio runs.
if (typeof window !== 'undefined') {
  const EVENTS = ['pointerdown', 'pointerup', 'keydown'] as const;
  const unlock = () => {
    if (!canStartAudio()) return;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    }
    audioCtx
      .resume()
      .then(() => {
        if (audioCtx?.state !== 'running') return;
        EVENTS.forEach((e) => window.removeEventListener(e, unlock, true));
        unlockWaiters.splice(0).forEach((fn) => fn());
      })
      .catch(() => {});
  };
  EVENTS.forEach((e) => window.addEventListener(e, unlock, true));
}

export type SoundType =
  | 'jump'
  | 'click'
  | 'flip'
  | 'match'
  | 'combo'
  | 'wrong'
  | 'drop'
  | 'merge'
  | 'warn'
  | 'over'
  | 'victory'
  | 'star'
  | 'levelup'
  | 'slice'
  | 'bomb'
  | 'freeze';

interface ToneOpts {
  type?: OscillatorType;
  gain: number;
  start?: number;
  dur: number;
  freq: number;
  to?: number;
  attack?: number;
}

function tone(ctx: AudioContext, out: AudioNode, { type = 'triangle', gain, start = 0, dur, freq, to, attack = 0.005 }: ToneOpts) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Filtered white noise: swooshes and explosions */
function noise(ctx: AudioContext, out: AudioNode, { gain, start = 0, dur, from, to }: { gain: number; start?: number; dur: number; from: number; to: number }) {
  const t = ctx.currentTime + start;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(out);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

/**
 * @param opts.level  For "merge": bigger fruit sound lower and rounder. For "slice": the combo so far, each cut a little higher.
 */
export function playSound(type: SoundType, settings: { sfxEnabled: boolean; volume: number }, opts: { level?: number } = {}) {
  if (!settings.sfxEnabled || settings.volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const v = (settings.volume / 100) * 0.35;
  const out = ctx.destination;

  try {
    switch (type) {
      case 'jump':
        // A springy "boing", higher for a long jump
        tone(ctx, out, { type: 'sine', gain: v * 0.45, dur: 0.14, freq: 360 * (opts.level ?? 1), to: 820 * (opts.level ?? 1) });
        break;
      case 'click':
        tone(ctx, out, { type: 'sine', gain: v * 0.35, dur: 0.06, freq: 880, to: 620 });
        break;
      case 'flip':
        tone(ctx, out, { type: 'triangle', gain: v * 0.4, dur: 0.07, freq: 520, to: 780 });
        break;
      case 'match':
        tone(ctx, out, { gain: v * 0.6, dur: 0.12, freq: NOTE(84) });
        tone(ctx, out, { gain: v * 0.6, start: 0.07, dur: 0.18, freq: NOTE(88) });
        break;
      case 'combo':
        [84, 88, 91, 96].forEach((n, i) => tone(ctx, out, { gain: v * 0.55, start: i * 0.055, dur: 0.14, freq: NOTE(n) }));
        break;
      case 'star':
        [91, 96, 100, 103].forEach((n, i) => tone(ctx, out, { type: 'sine', gain: v * 0.45, start: i * 0.04, dur: 0.16, freq: NOTE(n) }));
        break;
      case 'wrong':
        tone(ctx, out, { type: 'square', gain: v * 0.22, dur: 0.12, freq: 330, to: 260 });
        tone(ctx, out, { type: 'square', gain: v * 0.22, start: 0.11, dur: 0.16, freq: 247, to: 196 });
        break;
      case 'drop':
        tone(ctx, out, { type: 'sine', gain: v * 0.6, dur: 0.12, freq: 420, to: 160 });
        break;
      case 'merge': {
        const lv = opts.level ?? 3;
        const base = 900 / Math.pow(1.13, lv); // bigger fruit, lower "bloop"
        tone(ctx, out, { type: 'sine', gain: v * 0.75, dur: 0.16, freq: base * 0.6, to: base * 1.4 });
        tone(ctx, out, { type: 'triangle', gain: v * 0.3, start: 0.05, dur: 0.14, freq: base * 1.5 });
        break;
      }
      case 'warn':
        tone(ctx, out, { type: 'square', gain: v * 0.16, dur: 0.06, freq: 1320 });
        tone(ctx, out, { type: 'square', gain: v * 0.16, start: 0.09, dur: 0.06, freq: 1320 });
        break;
      case 'over':
        [67, 63, 60, 55].forEach((n, i) => tone(ctx, out, { type: 'square', gain: v * 0.2, start: i * 0.16, dur: i === 3 ? 0.45 : 0.15, freq: NOTE(n), to: i === 3 ? NOTE(n) * 0.94 : undefined }));
        break;
      case 'victory':
        [72, 76, 79, 84].forEach((n, i) => tone(ctx, out, { gain: v * 0.6, start: i * 0.09, dur: 0.18, freq: NOTE(n) }));
        tone(ctx, out, { type: 'sine', gain: v * 0.35, start: 0.36, dur: 0.5, freq: NOTE(96) });
        break;
      case 'slice': {
        const up = Math.pow(1.06, opts.level ?? 0);
        noise(ctx, out, { gain: v * 0.35, dur: 0.08, from: 7000, to: 1500 });
        tone(ctx, out, { type: 'sine', gain: v * 0.55, start: 0.015, dur: 0.1, freq: 560 * up, to: 200 * up });
        break;
      }
      case 'bomb':
        noise(ctx, out, { gain: v * 1.1, dur: 0.7, from: 2600, to: 60 });
        tone(ctx, out, { type: 'sine', gain: v * 0.9, dur: 0.55, freq: 150, to: 38 });
        break;
      case 'freeze':
        [100, 96, 93, 88].forEach((n, i) => tone(ctx, out, { type: 'sine', gain: v * 0.35, start: i * 0.06, dur: 0.22, freq: NOTE(n) }));
        break;
      case 'levelup':
        [79, 84, 88].forEach((n, i) => tone(ctx, out, { type: 'square', gain: v * 0.18, start: i * 0.08, dur: 0.12, freq: NOTE(n) }));
        break;
    }
  } catch {
    // Audio errors are ignored
  }
}
