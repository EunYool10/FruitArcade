// 과일 피아노 notes: a soft piano-like tone made from a few oscillators, bright at the start and
// mellowing as it fades
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

/** Notes go through one compressor, so fast runs and chords don't clip */
function output(ctx: AudioContext): AudioNode {
  if (bus?.ctx !== ctx) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.connect(ctx.destination);
    bus = { ctx, node: comp };
  }
  return bus.node;
}

export function playNote(midi: number, settings: { sfxEnabled: boolean; volume: number }): void {
  if (!settings.sfxEnabled || settings.volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const f = hz(midi);
    const v = (settings.volume / 100) * 0.24;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(12000, f * 9), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(500, f * 1.6), t + 1.1);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(v, t + 0.006);
    env.gain.exponentialRampToValueAtTime(v * 0.35, t + 0.3);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    filter.connect(env).connect(output(ctx));
    for (const [type, mult, gain, detune] of PARTIALS) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f * mult;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = gain;
      osc.connect(g).connect(filter);
      osc.start(t);
      osc.stop(t + 1.55);
    }
  } catch {
    // audio not available
  }
}
