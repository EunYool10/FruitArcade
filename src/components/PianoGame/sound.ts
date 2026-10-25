// 과일 피아노 notes: a soft piano-like tone made from a few oscillators, bright at the start and
// mellowing as it rings, through a little hall echo so the two hands sound full together
import { getAudioContext } from '../../utils/audio';

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Partials: wave, frequency multiple, loudness, detune (cents) */
const PARTIALS: [OscillatorType, number, number, number][] = [
  ['triangle', 1, 1, 0],
  ['triangle', 1, 0.45, -7],
  ['sine', 2, 0.35, 4],
  ['sine', 3, 0.12, -3],
];

let bus: { ctx: AudioContext; node: AudioNode } | null = null;

/** A second and a half of fading noise: the echo of a small hall */
function hallEcho(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 1.6);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  return buffer;
}

/** Notes go through one compressor (fast runs and chords don't clip), with some of them echoing */
function output(ctx: AudioContext): AudioNode {
  if (bus?.ctx !== ctx) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.connect(ctx.destination);
    const input = ctx.createGain();
    input.connect(comp);
    try {
      const echo = ctx.createConvolver();
      echo.buffer = hallEcho(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.22;
      input.connect(echo).connect(wet).connect(comp);
    } catch {
      // no echo, still fine
    }
    bus = { ctx, node: input };
  }
  return bus.node;
}

export interface NoteOptions {
  /** Seconds the note keeps ringing before it fades */
  sustain?: number;
  /** Loudness against a melody note (the left hand plays softer) */
  gain?: number;
}

/** Plays a note; release() fades it out early (a long tile let go) */
export function playNote(midi: number, settings: { sfxEnabled: boolean; volume: number }, opts: NoteOptions = {}): { release: () => void } {
  const none = { release: () => {} };
  if (!settings.sfxEnabled || settings.volume <= 0) return none;
  const ctx = getAudioContext();
  if (!ctx) return none;
  try {
    const t = ctx.currentTime;
    const f = hz(midi);
    const v = (settings.volume / 100) * 0.24 * (opts.gain ?? 1);
    const ring = Math.max(0.3, opts.sustain ?? 0.3);
    const end = t + ring + 1.2;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(12000, f * 9), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(500, f * 1.6), t + ring + 0.8);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(v, t + 0.006);
    env.gain.exponentialRampToValueAtTime(v * 0.45, t + 0.25);
    env.gain.exponentialRampToValueAtTime(v * 0.3, t + ring);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    filter.connect(env).connect(output(ctx));
    const oscs = PARTIALS.map(([type, mult, gain, detune]) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f * mult;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(filter);
      osc.start(t);
      osc.stop(end + 0.05);
      return osc;
    });
    return {
      release: () => {
        const now = ctx.currentTime;
        if (now >= end) return;
        env.gain.cancelScheduledValues(now);
        env.gain.setValueAtTime(Math.max(0.0001, env.gain.value), now);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
        for (const osc of oscs) osc.stop(now + 0.3);
      },
    };
  } catch {
    return none;
  }
}
