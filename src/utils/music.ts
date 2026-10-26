/**
 * Background music: short looping songs played by a Web Audio step sequencer.
 * Each song has a melody, a bass line, one chord per bar (played as a pad, off-beat stabs or
 * an arpeggio) and a drum groove. Melodies and bass are "NOTE:sixteenths" tokens ("-" is a rest).
 * Instruments are soft (plucks, bells, a breathy flute, a filtered saw) and run through a light
 * echo and a compressor, so the loops stay in the background.
 */
import { getAudioContext, whenAudioUnlocked } from './audio';

export type TrackName = 'lobby' | 'memory' | 'suika' | 'dash' | 'puzzle' | 'slice' | 'jump' | 'juice' | 'credits';

type Voice = 'pluck' | 'bell' | 'flute' | 'saw';
type Comp = 'pad' | 'offbeat' | 'arp';

interface Song {
  bpm: number;
  voice: Voice;
  /** Melody loudness (0..1) */
  leadGain: number;
  lead: string;
  bass: string;
  /** One chord per bar, notes separated by spaces ("C4 E4 G4") */
  chords: string[];
  comp: Comp;
  /** 16-step patterns per drum, x = hit: k kick, s snare, h hi-hat */
  drums: { k?: string; s?: string; h?: string };
}

const SONGS: Record<TrackName, Song> = {
  // Sunny and relaxed: C major, off-beat piano-like stabs
  lobby: {
    bpm: 104,
    voice: 'pluck',
    leadGain: 0.5,
    lead: `E5:3 G5:1 C6:4 B5:2 G5:2 E5:4 | D5:3 G5:1 B5:4 A5:2 G5:2 D5:4 |
           C5:3 E5:1 A5:4 G5:2 E5:2 C5:4 | B4:3 E5:1 G5:4 E5:2 G5:2 B5:4 |
           A5:2 C6:2 A5:2 F5:2 G5:2 A5:2 C6:4 | G5:2 E5:2 C5:2 E5:2 G5:4 -:4 |
           F5:2 A5:2 D6:2 C6:2 A5:2 F5:2 D5:4 | G5:2 B5:2 D6:2 B5:2 G5:4 -:4`,
    bass: `C3:6 C3:2 G2:4 C3:4 | G2:6 G2:2 D3:4 G2:4 | A2:6 A2:2 E3:4 A2:4 | E2:6 E2:2 B2:4 E2:4 |
           F2:6 F2:2 C3:4 F2:4 | C3:6 C3:2 G2:4 C3:4 | D3:6 D3:2 A2:4 D3:4 | G2:6 G2:2 D3:4 B2:4`,
    chords: ['C4 E4 G4', 'B3 D4 G4', 'C4 E4 A4', 'B3 E4 G4', 'C4 F4 A4', 'C4 E4 G4', 'D4 F4 A4', 'B3 D4 G4'],
    comp: 'offbeat',
    drums: { k: 'x-------x-x-----', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-' },
  },
  // Calm music box for concentrating: A minor, slow arpeggio, almost no drums
  memory: {
    bpm: 84,
    voice: 'bell',
    leadGain: 0.42,
    lead: `E5:4 A5:4 C6:6 B5:2 | A5:4 F5:4 C5:8 | G5:4 E5:4 C6:6 D6:2 | B5:4 G5:4 D5:8 |
           E5:4 A5:4 C6:4 E6:4 | D6:4 C6:4 A5:8 | F5:4 A5:4 D6:4 C6:4 | B5:4 G#5:4 E5:8`,
    bass: `A2:8 E3:8 | F2:8 C3:8 | C3:8 G2:8 | G2:8 D3:8 | A2:8 E3:8 | F2:8 C3:8 | D3:8 A2:8 | E2:8 B2:8`,
    chords: ['A3 C4 E4', 'F3 A3 C4', 'C4 E4 G4', 'G3 B3 D4', 'A3 C4 E4', 'F3 A3 C4', 'D4 F4 A4', 'E3 G#3 B3'],
    comp: 'arp',
    drums: { h: '----x-------x---' },
  },
  // Bouncy marimba: F major, the fruit-drop game
  suika: {
    bpm: 116,
    voice: 'pluck',
    leadGain: 0.48,
    lead: `C5:2 F5:2 A5:2 F5:2 C6:4 A5:4 | D6:2 C6:2 A#5:2 A5:2 A#5:4 F5:4 |
           G5:2 A5:2 A#5:2 C6:2 E5:4 G5:4 | A5:4 F5:2 C5:2 F5:8 |
           D5:2 F5:2 A5:2 D6:2 C6:4 A5:4 | A#5:2 D6:2 F6:2 D6:2 C6:4 A#5:4 |
           A5:2 G5:2 E5:2 G5:2 C6:4 E6:4 | D6:2 C6:2 A#5:2 G5:2 E5:4 -:4`,
    bass: `F2:4 C3:4 F2:4 C3:4 | A#2:4 F2:4 A#2:4 F2:4 | C3:4 G2:4 C3:4 G2:4 | F2:4 C3:4 F3:4 C3:4 |
           D3:4 A2:4 D3:4 A2:4 | A#2:4 F2:4 A#2:4 F2:4 | C3:4 G2:4 C3:4 G2:4 | C3:4 G2:4 E2:4 G2:4`,
    chords: ['F3 A3 C4', 'F3 A#3 D4', 'E3 G3 C4', 'F3 A3 C4', 'F3 A3 D4', 'F3 A#3 D4', 'E3 G3 C4', 'E3 A#3 C4'],
    comp: 'offbeat',
    drums: { k: 'x-------x-x-----', s: '----x-------x---', h: '--x---x---x---x-' },
  },
  // Smooth and thoughtful: G major, flute over a gentle arpeggio
  puzzle: {
    bpm: 100,
    voice: 'flute',
    leadGain: 0.42,
    lead: `B4:2 D5:2 G5:4 F#5:2 G5:2 A5:4 | G5:2 E5:2 B4:4 E5:2 G5:2 B5:4 |
           C6:4 B5:2 A5:2 G5:4 E5:4 | F#5:4 A5:4 D5:8 |
           B5:2 A5:2 G5:2 A5:2 B5:4 D6:4 | B5:4 F#5:4 D5:4 F#5:4 |
           E5:2 G5:2 C6:2 B5:2 A5:4 G5:4 | A5:4 F#5:4 D5:4 -:4`,
    bass: `G2:8 D3:8 | E2:8 B2:8 | C3:8 G2:8 | D3:8 A2:8 | G2:8 D3:8 | B2:8 F#2:8 | C3:8 G2:8 | D3:8 A2:4 F#2:4`,
    chords: ['G3 B3 D4', 'E3 G3 B3', 'C4 E4 G4', 'D4 F#4 A4', 'G3 B3 D4', 'B3 D4 F#4', 'C4 E4 G4', 'D4 F#4 A4'],
    comp: 'arp',
    drums: { k: 'x-----x---x-----', s: '----x-------x---', h: '--x---x---x---x-' },
  },
  // Quick and sharp: A minor, filtered saw lead, four-on-the-floor
  slice: {
    bpm: 132,
    voice: 'saw',
    leadGain: 0.34,
    lead: `A5:2 C6:2 E6:2 C6:2 A5:2 E5:2 A5:4 | F5:2 A5:2 C6:2 A5:2 F5:2 C5:2 F5:4 |
           G5:2 C6:2 E6:2 C6:2 G5:2 E5:2 G5:4 | B5:2 D6:2 G6:4 D6:2 B5:2 G5:4 |
           E6:2 D6:2 C6:2 B5:2 C6:4 A5:4 | A5:2 C6:2 F6:4 E6:2 C6:2 A5:4 |
           D6:2 C6:2 B5:2 G5:2 D6:4 B5:4 | G#5:2 B5:2 E6:4 D6:2 B5:2 G#5:4`,
    bass: `A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 | F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 |
           C3:2 C4:2 C3:2 C4:2 C3:2 C4:2 C3:2 C4:2 | G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 |
           A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 | F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 |
           G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 | E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2`,
    chords: ['A3 C4 E4', 'A3 C4 F4', 'G3 C4 E4', 'G3 B3 D4', 'A3 C4 E4', 'A3 C4 F4', 'G3 B3 D4', 'G#3 B3 E4'],
    comp: 'offbeat',
    drums: { k: 'x---x---x---x---', s: '----x-------x---', h: '--x---x---x---x-' },
  },
  // Running: E minor, bright pluck, driving bass
  dash: {
    bpm: 148,
    voice: 'pluck',
    leadGain: 0.46,
    lead: `E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 G5:4 | E5:2 G5:2 C6:2 E6:2 D6:2 C6:2 G5:4 |
           D5:2 G5:2 B5:2 D6:2 C6:2 B5:2 G5:4 | F#5:2 A5:2 D6:4 C6:2 A5:2 F#5:4 |
           G5:2 B5:2 E6:4 F#6:2 E6:2 B5:4 | C6:2 E6:2 G6:4 E6:2 C6:2 G5:4 |
           A5:2 C6:2 E6:2 C6:2 A5:2 E5:2 C6:4 | D#6:2 B5:2 F#5:2 B5:2 D#6:4 -:4`,
    bass: `E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 | C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 |
           G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 | D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 D2:2 D3:2 |
           E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 | C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 |
           A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 | B2:2 B3:2 B2:2 B3:2 B2:2 B3:2 B2:2 B3:2`,
    chords: ['E3 G3 B3', 'E3 G3 C4', 'D3 G3 B3', 'D3 F#3 A3', 'E3 G3 B3', 'E3 G3 C4', 'E3 A3 C4', 'D#3 F#3 B3'],
    comp: 'offbeat',
    drums: { k: 'x---x---x---x---', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-' },
  },
  // Bouncy run: D major, plucky lead hopping up and down, a skipping beat
  jump: {
    bpm: 136,
    voice: 'pluck',
    leadGain: 0.46,
    lead: `D5:2 F#5:2 A5:2 D6:2 A5:2 F#5:2 A5:4 | B5:2 G5:2 B5:2 D6:2 E6:4 D6:4 |
           C#6:2 A5:2 E5:2 A5:2 C#6:2 E6:2 C#6:4 | D6:2 A5:2 F#5:2 A5:2 D6:4 -:4 |
           F#6:2 E6:2 D6:2 B5:2 D6:4 B5:4 | G5:2 B5:2 D6:2 G6:2 F#6:4 E6:4 |
           E6:2 C#6:2 A5:2 C#6:2 E6:2 G6:2 F#6:4 | E6:2 D6:2 C#6:2 E6:2 D6:4 -:4`,
    bass: `D3:4 A2:4 D3:4 A2:4 | G2:4 D3:4 G2:4 D3:4 | A2:4 E3:4 A2:4 E3:4 | D3:4 A2:4 D3:4 F#2:4 |
           B2:4 F#2:4 B2:4 F#2:4 | G2:4 D3:4 G2:4 D3:4 | A2:4 E3:4 A2:4 C#3:4 | D3:4 A2:4 D3:8`,
    chords: ['D4 F#4 A4', 'G3 B3 D4', 'A3 C#4 E4', 'D4 F#4 A4', 'B3 D4 F#4', 'G3 B3 D4', 'A3 C#4 E4', 'D4 F#4 A4'],
    comp: 'offbeat',
    drums: { k: 'x-----x-x-------', s: '----x-------x---', h: 'x-x-x-x-x-x-x-x-' },
  },
  // A busy little shop: F major, bells over swung stabs
  juice: {
    bpm: 118,
    voice: 'bell',
    leadGain: 0.42,
    lead: `A5:2 C6:2 F6:4 E6:2 C6:2 A5:4 | A#5:2 D6:2 F6:4 D6:2 A#5:2 G5:4 |
           G5:2 A#5:2 E6:4 D6:2 C6:2 A#5:4 | A5:2 G5:2 F5:4 A5:4 C6:4 |
           D6:2 F6:2 A6:4 G6:2 F6:2 D6:4 | C6:2 E6:2 G6:4 F6:2 E6:2 C6:4 |
           A#5:2 D6:2 F6:2 D6:2 C6:2 A5:2 F5:4 | G5:2 A#5:2 E6:2 C6:2 F6:4 -:4`,
    bass: `F2:4 C3:4 F2:4 C3:4 | A#2:4 F2:4 A#2:4 F2:4 | C3:4 G2:4 C3:4 G2:4 | F2:4 C3:4 F2:4 A2:4 |
           D3:4 A2:4 D3:4 A2:4 | C3:4 G2:4 C3:4 G2:4 | A#2:4 F2:4 A#2:4 F2:4 | C3:4 G2:4 F2:8`,
    chords: ['F3 A3 C4', 'F3 A#3 D4', 'E3 G3 C4', 'F3 A3 C4', 'F3 A3 D4', 'E3 G3 C4', 'F3 A#3 D4', 'E3 G3 C4'],
    comp: 'offbeat',
    drums: { k: 'x-------x-------', s: '----x-------x---', h: '--x---x---x---x-' },
  },
  // The ending credits: a slow music box over soft pads, C major, ends each loop on G
  credits: {
    bpm: 76,
    voice: 'bell',
    leadGain: 0.4,
    lead: `E5:4 G5:4 C6:6 B5:2 | D6:4 B5:4 G5:8 | A5:4 C6:4 E6:6 D6:2 | B5:4 G5:4 E5:8 |
           F5:4 A5:4 C6:4 F6:4 | E6:4 D6:2 C6:2 G5:8 | F5:4 A5:4 D6:4 C6:4 | B5:4 D6:4 G5:8`,
    bass: `C3:8 G2:8 | B2:8 G2:8 | A2:8 E2:8 | G2:8 E2:8 | F2:8 C3:8 | E2:8 C3:8 | D3:8 A2:8 | G2:8 G2:4 B2:4`,
    chords: ['C4 E4 G4', 'B3 D4 G4', 'A3 C4 E4', 'G3 B3 E4', 'F3 A3 C4', 'E3 G3 C4', 'D4 F4 A4', 'D4 G4 B4'],
    comp: 'pad',
    drums: { h: '----x-------x---' },
  },
};

const NAMES: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "A#5" → 82 */
function midiOf(name: string): number | null {
  const m = name.match(/^([A-G]#?)(\d)$/);
  return m ? 12 * (Number(m[2]) + 1) + NAMES[m[1]] : null;
}

/** "A#5:2" → { midi: 82, len: 2 } */
function parse(seq: string): { midi: number | null; len: number }[] {
  return seq
    .split(/[\s|]+/)
    .filter(Boolean)
    .map((tok) => {
      const [name, len] = tok.split(':');
      return { midi: midiOf(name), len: Number(len) };
    });
}

interface Ev {
  midi: number;
  len: number;
  voice: 'lead' | 'bass';
}

function compile(song: Song) {
  const byStep = new Map<number, Ev[]>();
  let loop = 0;
  for (const voice of ['lead', 'bass'] as const) {
    let step = 0;
    for (const n of parse(song[voice])) {
      if (n.midi !== null) byStep.set(step, [...(byStep.get(step) || []), { midi: n.midi, len: n.len, voice }]);
      step += n.len;
    }
    loop = Math.max(loop, step);
  }
  const chords = song.chords.map((c) => c.split(' ').map(midiOf).filter((m): m is number => m !== null));
  return { byStep, loop, chords };
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

class MusicPlayer {
  /** What is playing: the screen's track, or the override on top of it */
  private track: TrackName | null = null;
  /** The screen's track (set by play) */
  private wanted: TrackName | null = null;
  /** A track that plays over the screen's for a while (the ending credits) */
  private override: TrackName | null = null;
  private compiled: ReturnType<typeof compile> | null = null;
  private song: Song | null = null;
  /** Volume control → compressor → speakers */
  private master: GainNode | null = null;
  /** Everything plays into this; the lead also feeds the echo */
  private mix: GainNode | null = null;
  private echo: GainNode | null = null;
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
    this.wanted = track;
    this.switchTo(this.override ?? track);
  }

  /** Play `track` over the screen's music (full volume, even in a window); null goes back to the screen's */
  playOver(track: TrackName | null) {
    this.override = track;
    this.applyGain();
    this.switchTo(track ?? this.wanted);
  }

  private switchTo(track: TrackName | null) {
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
    const target = this.enabled ? this.volume * 0.09 * (this.ducked && !this.override ? 0.35 : 1) : 0;
    this.master.gain.setTargetAtTime(target, ctx.currentTime, 0.15);
  }

  private build(ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);

    this.mix = ctx.createGain();
    this.mix.connect(this.master);

    // Echo for the melody: a dotted eighth that darkens as it repeats
    this.echo = ctx.createGain();
    this.echo.gain.value = 0.22;
    const delay = ctx.createDelay(1);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    this.echo.connect(delay);
    delay.connect(tone).connect(feedback).connect(delay);
    tone.connect(this.master);
    (this.echo as GainNode & { delay?: DelayNode }).delay = delay;

    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }

  private start() {
    const ctx = getAudioContext();
    if (!ctx || !this.track) return;
    this.ctx = ctx;
    if (!this.master) this.build(ctx);
    this.song = SONGS[this.track];
    this.compiled = compile(this.song);
    const delay = (this.echo as GainNode & { delay?: DelayNode }).delay;
    if (delay) delay.delayTime.value = (60 / this.song.bpm) * 0.75;
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
      const { byStep, loop, chords } = this.compiled;
      for (const e of byStep.get(this.step) || []) {
        const dur = Math.max(0.08, e.len * sixteenth);
        if (e.voice === 'lead') this.lead(ctx, hz(e.midi), t, dur);
        else this.bass(ctx, hz(e.midi), t, dur);
      }
      const inBar = this.step % 16;
      const chord = chords[Math.floor(this.step / 16) % chords.length];
      if (chord) this.comp(ctx, chord, inBar, t, sixteenth);
      for (const [kind, pattern] of Object.entries(this.song.drums)) {
        if (pattern?.[inBar] === 'x') this.drum(ctx, kind, t);
      }
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % loop;
    }
  }

  /** An oscillator through an envelope into `out` */
  private osc(ctx: AudioContext, type: OscillatorType, freq: number, t: number, peak: number, attack: number, hold: number, release: number, out: AudioNode, detune = 0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    if (hold > attack) g.gain.setTargetAtTime(peak * 0.6, t + attack, hold / 3);
    g.gain.setTargetAtTime(0.0001, t + Math.max(hold, attack), release / 4);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + Math.max(hold, attack) + release + 0.05);
    return o;
  }

  private filter(ctx: AudioContext, from: number, to: number, t: number, time: number, out: AudioNode): BiquadFilterNode {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + time);
    f.connect(out);
    return f;
  }

  private lead(ctx: AudioContext, f: number, t: number, dur: number) {
    const song = this.song!;
    const peak = song.leadGain;
    // Lead into the mix and, quieter, into the echo
    const bus = ctx.createGain();
    bus.connect(this.mix!);
    bus.connect(this.echo!);
    switch (song.voice) {
      case 'pluck': {
        const lp = this.filter(ctx, 3400, 900, t, 0.3, bus);
        this.osc(ctx, 'triangle', f, t, peak, 0.006, 0.05, Math.min(0.6, dur + 0.2), lp);
        this.osc(ctx, 'sine', f * 2, t, peak * 0.22, 0.006, 0.03, 0.25, lp);
        break;
      }
      case 'bell': {
        this.osc(ctx, 'sine', f, t, peak, 0.004, 0.02, 1.2, bus);
        this.osc(ctx, 'sine', f * 2, t, peak * 0.28, 0.004, 0.01, 0.5, bus);
        this.osc(ctx, 'sine', f * 3.01, t, peak * 0.1, 0.002, 0.01, 0.2, bus);
        break;
      }
      case 'flute': {
        const lp = this.filter(ctx, 2600, 2000, t, dur, bus);
        const main = this.osc(ctx, 'sine', f, t, peak, 0.05, dur * 0.85, 0.12, lp);
        this.osc(ctx, 'triangle', f, t, peak * 0.25, 0.05, dur * 0.85, 0.12, lp, 6);
        // Gentle vibrato once the note settles
        if (dur > 0.25) {
          const lfo = ctx.createOscillator();
          const depth = ctx.createGain();
          lfo.frequency.value = 5.2;
          depth.gain.setValueAtTime(0, t);
          depth.gain.linearRampToValueAtTime(7, t + 0.2);
          lfo.connect(depth).connect(main.detune);
          lfo.start(t);
          lfo.stop(t + dur + 0.2);
        }
        break;
      }
      case 'saw': {
        const lp = this.filter(ctx, 2600, 1100, t, 0.18, bus);
        this.osc(ctx, 'sawtooth', f, t, peak * 0.6, 0.008, dur * 0.7, 0.12, lp, -8);
        this.osc(ctx, 'sawtooth', f, t, peak * 0.6, 0.008, dur * 0.7, 0.12, lp, 8);
        break;
      }
    }
  }

  private bass(ctx: AudioContext, f: number, t: number, dur: number) {
    const lp = this.filter(ctx, 900, 500, t, 0.15, this.mix!);
    this.osc(ctx, 'sine', f, t, 0.55, 0.008, dur * 0.85, 0.08, lp);
    this.osc(ctx, 'triangle', f, t, 0.22, 0.008, dur * 0.6, 0.08, lp);
  }

  /** Chords: a soft pad on the bar, stabs off the beat, or an arpeggio in eighths */
  private comp(ctx: AudioContext, chord: number[], inBar: number, t: number, sixteenth: number) {
    const style = this.song!.comp;
    if (style === 'pad' && inBar === 0) {
      const lp = this.filter(ctx, 1200, 1200, t, 1, this.mix!);
      for (const m of chord) this.osc(ctx, 'triangle', hz(m), t, 0.07, 0.3, sixteenth * 15, 0.4, lp);
    } else if (style === 'offbeat' && inBar % 4 === 2) {
      const lp = this.filter(ctx, 2000, 700, t, 0.12, this.mix!);
      for (const m of chord) this.osc(ctx, 'triangle', hz(m), t, 0.09, 0.005, 0.04, 0.16, lp);
    } else if (style === 'arp' && inBar % 2 === 0) {
      const i = inBar / 2;
      const m = chord[i % chord.length] + (i >= chord.length * 2 ? 12 : 0);
      this.osc(ctx, 'sine', hz(m), t, 0.11, 0.004, 0.02, 0.45, this.mix!);
    }
  }

  private drum(ctx: AudioContext, kind: string, t: number) {
    const out = this.mix!;
    if (kind === 'k') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.13);
      g.gain.setValueAtTime(0.75, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.2);
      return;
    }
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    if (kind === 's') {
      // Soft clap-like snare: band of noise plus a short body tone
      f.type = 'bandpass';
      f.frequency.value = 1800;
      f.Q.value = 0.8;
      g.gain.setValueAtTime(0.32, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      this.osc(ctx, 'triangle', 190, t, 0.12, 0.002, 0.01, 0.08, out);
    } else {
      f.type = 'highpass';
      f.frequency.value = 8000;
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    }
    src.connect(f).connect(g).connect(out);
    src.start(t);
    src.stop(t + 0.2);
  }
}

export const music = new MusicPlayer();
