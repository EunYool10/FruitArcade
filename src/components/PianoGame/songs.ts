// 과일 피아노 songs. Every melody here is old enough to be free for anyone to use: folk and
// children's songs, carols and classical pieces whose composers died long ago. Notes and rhythm
// come from the solo flute scores on flutetunes.com; the chords are chosen to fit them.
//
// Melody: one row per step of the song (an eighth note, or a sixteenth for the fast pieces).
// "E5" is a note, each "-" after it holds it one more row, "." is a silent row. A note held for
// `hold` rows or more becomes a long tile you keep pressing.
// Chords: "Am:8" plays A minor for 8 rows ("x" = nothing); `style` is how the left hand plays them.

export type Style = 'alberti' | 'waltz' | 'canon' | 'elise' | 'march';

export interface Song {
  id: string;
  name: string;
  /** Who wrote it (or where it comes from) */
  by: string;
  /** Rows per second on the first lap */
  speed: number;
  /** Notes this many rows long or longer are long tiles */
  hold: number;
  style: Style;
  melody: string;
  chords: string;
}

export const SONGS: Song[] = [
  {
    id: 'twinkle',
    name: '반짝반짝 작은 별',
    by: '프랑스 민요',
    speed: 3.2,
    hold: 4,
    style: 'alberti',
    melody: `C5- C5- G5- G5- A5- A5- G5--- F5- F5- E5- E5- D5- D5- C5--- G5- G5- F5- F5- E5- E5- D5--- G5- G5- F5- F5- E5- E5- D5--- C5- C5- G5- G5- A5- A5- G5--- F5- F5- E5- E5- D5- D5- C5---`,
    chords: 'C:8 F:4 C:4 G7:4 C:4 G:4 C:4 C:4 F:4 C:4 G:4 C:4 F:4 C:4 G:4 C:8 F:4 C:4 G7:4 C:4 G:4 C:4',
  },
  {
    id: 'plane',
    name: '떴다 떴다 비행기',
    by: '미국 민요',
    speed: 3.2,
    hold: 4,
    style: 'alberti',
    melody: `E5 . D5 . C5 . D5 . E5 . E5 . E5--- D5 . D5 . D5--- E5 . E5 . E5--- E5 . D5 . C5 . D5 . E5 . E5 . E5--- D5 . D5 . E5 . D5 . C5-------`,
    chords: 'C:16 G:8 C:24 G:8 C:8',
  },
  {
    id: 'nabi',
    name: '나비야',
    by: '독일 민요',
    speed: 3.4,
    hold: 4,
    style: 'alberti',
    melody: `G5- E5 . E5--- F5- D5 . D5--- C5- D5- E5- F5- G5 . G5 . G5--- G5- E5 . E5--- F5- D5 . D5--- C5- E5- G5 . G5 . E5--- . . . . D5- D5- D5 . D5 . D5- E5- F5--- E5- E5- E5 . E5 . E5- F5- G5--- G5- E5 . E5--- F5- D5 . D5--- C5- E5- G5 . G5 . C5--- . . . .`,
    chords: 'C:8 G7:8 C:24 G7:8 C:16 G7:16 C:24 G7:8 C:16',
  },
  {
    id: 'birthday',
    name: '생일 축하합니다',
    by: '힐 자매',
    speed: 3.2,
    hold: 4,
    style: 'waltz',
    melody: `D4 D4 E4- D4- G4- F#4--- D4 D4 E4- D4- A4- G4--- D4 D4 D5- B4- G4- F#4- E4- C5 C5 B4- G4- A4- G4---`,
    chords: 'x:2 G:6 D7:12 G:12 D7:2 C:2 Am:2 G:4 D7:2 G:4',
  },
  {
    id: 'london',
    name: '런던 다리',
    by: '영국 민요',
    speed: 3,
    hold: 2,
    style: 'alberti',
    melody: `C5 D5 C5 A#4 A4 A#4 C5- G4 A4 A#4- A4 A#4 C5- C5 D5 C5 A#4 A4 A#4 C5- G4- C5- A4 F4 . . C5 D5 C5 A#4 A4 A#4 C5- G4 A4 A#4- A4 A#4 C5- C5 D5 C5 A#4 A4 A#4 C5- G4- C5- A4 F4 . .`,
    chords: 'F:8 C7:4 F:12 C7:4 F:4 F:8 C7:4 F:12 C7:4 F:4',
  },
  {
    id: 'ode',
    name: '환희의 송가',
    by: '베토벤',
    speed: 3.6,
    hold: 4,
    style: 'alberti',
    melody: `F#5- F#5- G5- A5- A5- G5- F#5- E5- D5- D5- E5- F#5- F#5-- E5 E5--- F#5- F#5- G5- A5- A5- G5- F#5- E5- D5- D5- E5- F#5- E5-- D5 D5--- E5- E5- F#5- D5- E5- F#5 G5 F#5- D5- E5- F#5 G5 F#5- E5- D5- E5- A4- F#5--- F#5- G5- A5- A5- G5- F#5- G5 E5 D5- D5- E5- F#5- E5-- D5 D5---`,
    chords: 'D:8 A7:8 D:8 D:4 A:4 D:8 A7:8 D:8 A:4 D:4 A:4 D:4 A:4 D:4 A7:8 D:2 A:4 D:2 D:8 A7:4 D:2 A7:2 D:8 A:4 D:4',
  },
  {
    id: 'lullaby',
    name: '브람스 자장가',
    by: '브람스',
    speed: 3,
    hold: 3,
    style: 'waltz',
    melody: `G4 G4 A#4-- G4 G4- A#4- . . G4 A#4 D#5- D5-- C5 C5- A#4- F4 G4 G#4- F4- F4 G4 G#4- . . F4 G#4 D5 C5 A#4- D5- D#5- . . D#4 D#4 D#5--- C5 G#4 A#4--- G4 D#4 G#4- A#4- C5- A#4--- D#4 D#4 D#5--- C5 G#4 A#4--- G4 D#4 G#4- G4- F4- D#4---`,
    chords: 'x:2 Eb:12 Bb7:30 Eb:6 Ab:6 Eb:6 Fm:6 Eb:6 Ab:6 Eb:6 Bb7:6 Eb:4',
  },
  {
    id: 'jingle',
    name: '징글벨',
    by: '피어폰트',
    speed: 3,
    hold: 4,
    style: 'alberti',
    melody: `E5 E5 E5- E5 E5 E5- E5 G5 C5 D5 E5--- F5 F5 F5 F5 F5 E5 E5 E5 E5 D5 D5 E5 D5- G5- E5 E5 E5- E5 E5 E5- E5 G5 C5 D5 E5--- F5 F5 F5 F5 F5 E5 E5 E5 G5 G5 F5 D5 C5---`,
    chords: 'C:16 F:4 C:4 D7:4 G:4 C:16 F:4 C:4 G7:4 C:4',
  },
  {
    id: 'silent',
    name: '고요한 밤 거룩한 밤',
    by: '그루버',
    speed: 3,
    hold: 3,
    style: 'waltz',
    melody: `G5 A5 G5 E5-- G5 A5 G5 E5-- D6- D6 B5-- C6- C6 G5-- A5- A5 C6 B5 A5 G5 A5 G5 E5-- A5- A5 C6 B5 A5 G5 A5 G5 E5-- D6- D6 F6 D6 B5 C6-- E6- . C6 G5 E5 G5 F5 D5 C5---- .`,
    chords: 'C:12 G7:6 C:6 F:6 C:6 F:6 C:6 G7:6 C:6 C:3 G7:3 C:6',
  },
  {
    id: 'minuet',
    name: '미뉴에트 G장조',
    by: '페촐트',
    speed: 3.4,
    hold: 4,
    style: 'waltz',
    melody: `D5- G4 A4 B4 C5 D5- G4 . G4 . E5- C5 D5 E5 F#5 G5- G4 . G4 . C5- D5 C5 B4 A4 B4- C5 B4 A4 G4 F#4- G4 A4 B4 G4 B4- A4--- D5- G4 A4 B4 C5 D5- G4 . G4 . E5- C5 D5 E5 F#5 G5- G4 . G4 . C5- D5 C5 B4 A4 B4- C5 B4 A4 G4 A4 . B4 A4 G4 F#4 G4-----`,
    chords: 'G:12 C:6 G:6 C:6 G:6 D:6 G:2 D:4 G:12 C:6 G:6 C:6 G:6 D7:6 G:6',
  },
  {
    id: 'elise',
    name: '엘리제를 위하여',
    by: '베토벤',
    speed: 4.2,
    hold: 4,
    style: 'elise',
    melody: `E5 D#5 E5 D#5 E5 B4 D5 C5 A4- . C4 E4 A4 B4- . E4 G#4 B4 C5- . E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4- . C4 E4 A4 B4- . E4 C5 B4 A4--- E5 D#5 E5 D#5 E5 B4 D5 C5 A4- . C4 E4 A4 B4- . E4 G#4 B4 C5- . E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4- . C4 E4 A4 B4- . E4 C5 B4 A4---`,
    chords: 'x:8 Am:6 E:6 Am:6 x:6 Am:6 E:6 Am:4 x:8 Am:6 E:6 Am:6 x:6 Am:6 E:6 Am:4',
  },
  {
    id: 'canon',
    name: '캐논',
    by: '파헬벨',
    speed: 3.4,
    hold: 2,
    style: 'canon',
    melody: `F#5- E5- D5- C#5- B4- A4- B4- C#5- D5- C#5- B4- A4- G4- F#4- G4- E4- D4 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A4 G4 B4 A4 G4 F#4 D4 E4 C#5 D5 F#5 A5 A4 B4 G4 A4 F#4 D4 D5 E5 C#5 F#4 F#5 E5- . D5 F#5- B5- A5- B5- C#6- D6-------`,
    chords: 'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:8',
  },
  {
    id: 'turkish',
    name: '터키 행진곡',
    by: '모차르트',
    speed: 4.4,
    hold: 4,
    style: 'march',
    melody: `B4 A4 G#4 A4 C5 . . . D5 C5 B4 C5 E5 . . . F5 E5 D#5 E5 B5 A5 G#5 A5 B5 A5 G#5 A5 C6--- A5 . C6 . B5 . A5 . G5 . A5 . B5 . A5 . G5 . A5 . B5 . A5 . G5 . F#5 . E5--- E5 . F5 . G5 . G5 . A5 G5 F5 E5 D5--- E5 . F5 . G5 . G5 . A5 G5 F5 E5 D5--- C5 . D5 . E5 . E5 . F5 E5 D5 C5 B4--- C5 . D5 . E5 . E5 . F5 E5 D5 C5 B4--- B4 A4 G#4 A4 C5 . . . D5 C5 B4 C5 E5 . . . F5 E5 D#5 E5 B5 A5 G#5 A5 B5 A5 G#5 A5 C6--- A5 . B5 . C6 . B5 . A5 . G#5 . A5 . E5 . F5 . D5 . C5--- B4--- A4---`,
    chords: 'x:4 Am:32 Em:16 B7:8 Em:4 C:8 Dm:4 G7:4 C:8 Dm:4 G7:4 Am:8 Dm:4 E7:4 Am:8 Dm:4 E7:8 Am:32 Am:4 E:4 Am:4 Dm:4 Am:4 E:4 Am:4',
  },
];

export const songById = (id: string | undefined) => SONGS.find((s) => s.id === id) ?? null;

const NAMES: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

/** "A4" → 69 (MIDI), or null */
export function midiOf(name: string): number | null {
  const m = name.match(/^([A-G][#b]?)(\d)$/);
  return m && m[1] in NAMES ? 12 * (Number(m[2]) + 1) + NAMES[m[1]] : null;
}

/** A tile: where it starts, how many rows it covers (more than 1 = hold it), its note and how long the note rings */
export interface SongTile {
  row: number;
  len: number;
  note: number;
  sound: number;
}

/** One time through a song: its tiles, and the left hand's notes for every row */
export interface Lap {
  rows: number;
  tiles: SongTile[];
  left: number[][];
}

const QUALITY: Record<string, number[]> = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10] };

/** Left-hand notes for row `i` of a chord (bass between E2 and D#3) */
function leftNotes(style: Style, chord: string, i: number): number[] {
  if (chord === 'x') return [];
  const m = chord.match(/^([A-G][#b]?)(m7|m|7)?$/);
  if (!m || !(m[1] in NAMES)) throw new Error(`Bad chord "${chord}"`);
  const q = QUALITY[m[2] ?? ''];
  const bass = 40 + ((NAMES[m[1]] - 4 + 12) % 12);
  const third = bass + q[1];
  const fifth = bass + 7;
  // Close chord an octave up (a seventh chord swaps its root for the seventh)
  const upper = q.length > 3 ? [third + 12, fifth + 12, bass + 22] : [bass + 12, third + 12, fifth + 12];
  switch (style) {
    case 'alberti': // low - high - middle - high
      return [[bass], [fifth], [third], [fifth]][i % 4];
    case 'waltz': // a rolling arpeggio across the bar
      return [[bass], [fifth], [bass + 12], [third + 12], [bass + 12], [fifth]][i % 6];
    case 'canon': // bass, then the chord
      return i % 2 ? upper : [bass];
    case 'elise': // A E A, then rest while the right hand answers
      return [[bass], [fifth], [bass + 12], [], [], []][i % 6];
    case 'march': // oom-pah in eighths
      return [[bass], [], upper, [], [fifth], [], upper, []][i % 8];
  }
}

/** The song as tiles and left-hand rows, bottom first */
export function songLap(song: Song): Lap {
  const tiles: SongTile[] = [];
  let row = 0;
  for (const token of song.melody.trim().split(/\s+/)) {
    if (token === '.') {
      row++;
      continue;
    }
    const m = token.match(/^([A-G][#b]?\d)(-*)$/);
    const note = m ? midiOf(m[1]) : null;
    if (note === null) throw new Error(`Bad note "${token}" in ${song.id}`);
    const sound = 1 + m![2].length;
    tiles.push({ row, len: sound >= song.hold ? sound : 1, note, sound });
    row += sound;
  }
  const left: number[][] = Array.from({ length: row }, () => []);
  let at = 0;
  for (const part of song.chords.trim().split(/\s+/)) {
    const [name, count] = part.split(':');
    for (let i = 0; i < Number(count) && at < row; i++) left[at++] = leftNotes(song.style, name, i);
  }
  return { rows: row, tiles, left };
}

/** How hard a song feels on its first lap: tiles per second */
export const songLevel = (s: Song) => {
  const lap = songLap(s);
  const rate = (lap.tiles.length / lap.rows) * s.speed;
  return rate <= 1.7 ? '쉬움' : rate <= 2.3 ? '보통' : '어려움';
};
