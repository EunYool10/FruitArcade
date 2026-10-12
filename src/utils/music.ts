/**
 * Background music: small chiptune loops played by a Web Audio step sequencer.
 * Songs are written as "NOTE:sixteenths" tokens ("-" is a rest).
 */
import { getAudioContext, whenAudioUnlocked } from './audio';

export type TrackName = 'lobby' | 'memory' | 'suika' | 'dash' | 'puzzle' | 'slice';

interface Song {
  bpm: number;
  lead: string;
  bass: string;
  /** One bar of drums, 16 steps: k = kick, s = snare, h = hat, - = rest */
  drums: string;
  leadWave: OscillatorType;
  leadGain: number;
}

const SONGS: Record<TrackName, Song> = {
  lobby: {
    bpm: 112,
    leadWave: 'triangle',
    leadGain: 0.5,
    lead: `E5:2 G5:2 C6:2 G5:2 A5:2 G5:2 E5:4 | F5:2 E5:2 D5:2 E5:2 C5:4 -:4 |
           E5:2 G5:2 C6:2 G5:2 A5:2 C6:2 D6:4 | C6:2 B5:2 A5:2 B5:2 G5:4 -:4 |
           A5:2 A5:2 G5:2 E5:2 F5:2 F5:2 E5:2 C5:2 | D5:2 E5:2 F5:2 A5:2 G5:4 -:4 |
           E5:2 G5:2 C6:2 G5:2 A5:2 G5:2 E5:2 D5:2 | C5:4 E5:2 G5:2 C6:6 -:2`,
    bass: `C3:4 G3:4 C3:4 G3:4 | F2:4 C3:4 G2:4 D3:4 | C3:4 G3:4 C3:4 G3:4 | G2:4 D3:4 G2:4 D3:4 |
           F2:4 C3:4 F2:4 C3:4 | G2:4 D3:4 G2:4 D3:4 | C3:4 G3:4 A2:4 E3:4 | F2:4 G2:4 C3:8`,
    drums: 'k-h-s-h-k-h-s-h-',
  },
  memory: {
    bpm: 92,
    leadWave: 'sine',
    leadGain: 0.6,
    lead: `A5:4 C6:4 E6:4 C6:4 | D6:4 C6:4 A5:8 | G5:4 A5:4 C6:4 E6:4 | D6:8 -:8 |
           A5:4 C6:4 E6:4 G6:4 | F6:4 E6:4 D6:8 | C6:4 D6:4 E6:4 C6:4 | A5:12 -:4`,
    bass: `A2:8 E3:8 | F2:8 C3:8 | C3:8 G3:8 | G2:8 D3:8 | A2:8 E3:8 | F2:8 C3:8 | C3:8 G2:8 | A2:16`,
    drums: '----h-------h---',
  },
  suika: {
    bpm: 120,
    leadWave: 'square',
    leadGain: 0.28,
    lead: `F5:2 A5:2 C6:2 A5:2 F5:2 A5:2 C6:4 | D6:2 C6:2 A5:2 G5:2 F5:4 -:4 |
           G5:2 A5:2 A#5:2 A5:2 G5:2 E5:2 C5:4 | E5:2 F5:2 G5:2 A5:2 F5:4 -:4 |
           F5:2 A5:2 C6:2 F6:2 E6:2 D6:2 C6:4 | A#5:2 A5:2 G5:2 A5:2 F5:4 -:4 |
           G5:2 G5:2 A5:2 A#5:2 C6:2 A5:2 F5:4 | G5:4 E5:4 F5:6 -:2`,
    bass: `F2:4 C3:4 F3:4 C3:4 | A#2:4 F3:4 A#3:4 F3:4 | C3:4 G3:4 C4:4 G3:4 | F2:4 C3:4 F3:4 C3:4 |
           F2:4 C3:4 F3:4 C3:4 | A#2:4 F3:4 A#3:4 F3:4 | C3:4 G3:4 C4:4 G3:4 | C3:4 G2:4 F2:8`,
    drums: 'k---s---k-k-s---',
  },
  puzzle: {
    bpm: 104,
    leadWave: 'triangle',
    leadGain: 0.5,
    lead: `G5:2 B5:2 D6:2 B5:2 C6:2 B5:2 G5:4 | A5:2 B5:2 C6:2 A5:2 G5:4 -:4 |
           E5:2 G5:2 B5:2 G5:2 A5:2 G5:2 E5:4 | F#5:2 G5:2 A5:2 F#5:2 D5:4 -:4 |
           G5:2 B5:2 D6:2 G6:2 F#6:2 E6:2 D6:4 | C6:2 B5:2 A5:2 B5:2 G5:4 -:4 |
           E5:2 F#5:2 G5:2 A5:2 B5:2 C6:2 D6:4 | C6:2 A5:2 F#5:2 A5:2 G5:6 -:2`,
    bass: `G2:4 D3:4 G2:4 D3:4 | C3:4 G3:4 C3:4 G3:4 | E2:4 B2:4 E2:4 B2:4 | D3:4 A3:4 D3:4 A3:4 |
           G2:4 D3:4 G2:4 D3:4 | C3:4 G3:4 C3:4 G3:4 | C3:4 G3:4 D3:4 A3:4 | D3:4 A2:4 G2:8`,
    drums: 'k-h-s-hhk-h-s-h-',
  },
  slice: {
    bpm: 136,
    leadWave: 'square',
    leadGain: 0.24,
    lead: `A5:2 C6:2 D6:2 E6:2 D6:2 C6:2 A5:4 | G5:2 A5:2 C6:2 A5:2 G5:2 E5:2 D5:4 |
           E5:2 G5:2 A5:2 C6:2 D6:2 E6:2 G6:4 | E6:2 D6:2 C6:2 D6:2 A5:4 -:4 |
           A5:2 A5:2 C6:2 A5:2 D6:2 C6:2 A5:2 G5:2 | E5:2 G5:2 A5:2 G5:2 E5:4 D5:4 |
           C6:2 D6:2 E6:2 G6:2 E6:2 D6:2 C6:2 D6:2 | E6:4 D6:2 C6:2 A5:6 -:2`,
    bass: `A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 | G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 |
           C3:2 C4:2 C3:2 C4:2 C3:2 C4:2 C3:2 C4:2 | D3:2 D4:2 D3:2 D4:2 E3:2 E4:2 E3:2 E4:2 |
           A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 | E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 |
           C3:2 C4:2 C3:2 C4:2 D3:2 D4:2 D3:2 D4:2 | A2:2 A3:2 A2:2 A3:2 A2:4 -:4`,
    drums: 'k-hhs-h-k-hhs-hh',
  },
  dash: {
    bpm: 150,
    leadWave: 'square',
    leadGain: 0.25,
    lead: `E5:2 E5:2 G5:2 E5:2 A5:2 G5:2 E5:2 D5:2 | E5:2 E5:2 G5:2 E5:2 B5:4 A5:4 |
           E5:2 E5:2 G5:2 E5:2 A5:2 B5:2 D6:2 B5:2 | A5:2 G5:2 E5:2 D5:2 E5:8 |
           E6:2 D6:2 B5:2 G5:2 A5:2 B5:2 G5:2 E5:2 | D5:2 E5:2 G5:2 A5:2 B5:8 |
           E5:2 E5:2 G5:2 E5:2 A5:2 B5:2 D6:2 B5:2 | A5:2 G5:2 E5:2 D5:2 E5:8`,
    bass: `E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 | E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 |
           C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 | D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 |
           E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 | C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 |
           C2:2 C3:2 C2:2 C3:2 D2:2 D3:2 D2:2 D3:2 | E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2`,
    drums: 'k-h-s-h-k-k-s-hh',
  },
};

const NAMES: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "A#5:2" → { midi: 82, len: 2 } */
function parse(seq: string): { midi: number | null; len: number }[] {
  return seq
    .split(/[\s|]+/)
    .filter(Boolean)
    .map((tok) => {
      const [name, len] = tok.split(':');
      const m = name.match(/^([A-G]#?)(\d)$/);
      return { midi: m ? 12 * (Number(m[2]) + 1) + NAMES[m[1]] : null, len: Number(len) };
    });
}

interface Ev {
  step: number;
  midi: number;
  len: number;
  voice: 'lead' | 'bass';
}

function compile(song: Song) {
  const events: Ev[] = [];
  let loop = 0;
  for (const voice of ['lead', 'bass'] as const) {
    let step = 0;
    for (const n of parse(song[voice])) {
      if (n.midi !== null) events.push({ step, midi: n.midi, len: n.len, voice });
      step += n.len;
    }
    loop = Math.max(loop, step);
  }
  const byStep = new Map<number, Ev[]>();
  for (const e of events) byStep.set(e.step, [...(byStep.get(e.step) || []), e]);
  return { byStep, loop };
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class MusicPlayer {
  private track: TrackName | null = null;
  private compiled: ReturnType<typeof compile> | null = null;
  private song: Song | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private volume = 0.4;
  private enabled = true;
  private ducked = false;
  private ctx: AudioContext | null = null;

  constructor() {
    // Music asked for before the first tap starts as soon as audio is allowed
    whenAudioUnlocked(() => {
      if (this.track && this.enabled && !this.timer) this.start();
    });
  }

  configure(enabled: boolean, volume0to100: number) {
    this.enabled = enabled && volume0to100 > 0;
    this.volume = volume0to100 / 100;
    this.applyGain();
    if (!this.enabled) this.halt();
    else if (this.track && !this.timer) this.start();
  }

  play(track: TrackName | null) {
    if (track === this.track && this.timer) return;
    this.halt();
    this.track = track;
    if (track && this.enabled) this.start();
  }

  /** Quieter while a game is paused or a window is open */
  duck(on: boolean) {
    this.ducked = on;
    this.applyGain();
  }

  private applyGain() {
    if (!this.master) return;
    const ctx = this.master.context;
    const target = this.enabled ? this.volume * 0.16 * (this.ducked ? 0.35 : 1) : 0;
    this.master.gain.setTargetAtTime(target, ctx.currentTime, 0.15);
  }

  private start() {
    const ctx = getAudioContext();
    if (!ctx || !this.track) return;
    this.ctx = ctx;
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    this.song = SONGS[this.track];
    this.compiled = compile(this.song);
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.1;
    this.applyGain();
    this.timer = setInterval(() => this.tick(), 30);
  }

  private halt() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick() {
    // Reads the context directly: asking it to resume 30 times a second spams warnings while locked
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.song || !this.compiled || !this.master) return;
    if (document.hidden) return;
    const sixteenth = 60 / this.song.bpm / 4;
    // Fell behind (tab was hidden, audio was locked): restart from now
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const t = this.nextTime;
      for (const e of this.compiled.byStep.get(this.step) || []) this.note(ctx, e, t, sixteenth);
      const d = this.song.drums[this.step % 16];
      if (d && d !== '-') this.drum(ctx, d, t);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % this.compiled.loop;
    }
  }

  private note(ctx: AudioContext, e: Ev, t: number, sixteenth: number) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lead = e.voice === 'lead';
    const peak = lead ? this.song!.leadGain : 0.55;
    const dur = Math.max(0.06, e.len * sixteenth * (lead ? 0.85 : 0.9));
    osc.type = lead ? this.song!.leadWave : 'triangle';
    osc.frequency.setValueAtTime(hz(e.midi), t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(peak * 0.55, t + Math.min(0.12, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private drum(ctx: AudioContext, kind: string, t: number) {
    if (kind === 'k') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g).connect(this.master!);
      osc.start(t);
      osc.stop(t + 0.16);
      return;
    }
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = kind === 'h' ? 7000 : 1500;
    const g = ctx.createGain();
    const len = kind === 'h' ? 0.035 : 0.11;
    g.gain.setValueAtTime(kind === 'h' ? 0.18 : 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + len + 0.02);
  }
}

export const music = new MusicPlayer();
