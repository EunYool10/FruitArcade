/**
 * Sound effects, synthesized with the Web Audio API (no audio files).
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

// Browsers keep audio locked until the first tap/key press
if (typeof window !== 'undefined') {
  const unlock = () => {
    getAudioContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

export type SoundType =
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
  | 'levelup';

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

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

/**
 * @param opts.level  For "merge": bigger fruit sound lower and rounder.
 */
export function playSound(type: SoundType, settings: { sfxEnabled: boolean; volume: number }, opts: { level?: number } = {}) {
  if (!settings.sfxEnabled || settings.volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const v = (settings.volume / 100) * 0.35;
  const out = ctx.destination;

  try {
    switch (type) {
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
      case 'levelup':
        [79, 84, 88].forEach((n, i) => tone(ctx, out, { type: 'square', gain: v * 0.18, start: i * 0.08, dur: 0.12, freq: NOTE(n) }));
        break;
    }
  } catch {
    // Audio errors are ignored
  }
}
