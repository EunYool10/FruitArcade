// 과일 피아노 songs. Every melody here is old enough to be free for anyone to use: folk and
// children's songs, carols and classical pieces whose composers died long ago.
//
// A melody is a list of notes, one tile each ("C4", "F#5"). Each "-" after a note adds an empty
// row after its tile, so a long note gets a pause before the next tile and the rhythm survives.

export interface Song {
  id: string;
  name: string;
  /** Who wrote it (or where it comes from) */
  by: string;
  /** Rows per second on the first lap */
  speed: number;
  /** Semitones added to every note (keeps melodies in a range phone speakers play well) */
  shift?: number;
  melody: string;
}

export const SONGS: Song[] = [
  {
    id: 'twinkle',
    name: '반짝반짝 작은 별',
    by: '프랑스 민요',
    speed: 2.4,
    shift: 12,
    melody: `C4 C4 G4 G4 A4 A4 G4- F4 F4 E4 E4 D4 D4 C4-
             G4 G4 F4 F4 E4 E4 D4- G4 G4 F4 F4 E4 E4 D4-
             C4 C4 G4 G4 A4 A4 G4- F4 F4 E4 E4 D4 D4 C4-`,
  },
  {
    id: 'plane',
    name: '떴다 떴다 비행기',
    by: '미국 민요',
    speed: 2.4,
    shift: 12,
    melody: `E4 D4 C4 D4 E4 E4 E4- D4 D4 D4- E4 E4 E4-
             E4 D4 C4 D4 E4 E4 E4- D4 D4 E4 D4 C4---`,
  },
  {
    id: 'nabi',
    name: '나비야',
    by: '독일 민요',
    speed: 2.5,
    shift: 12,
    melody: `G4 E4 E4- F4 D4 D4- C4 D4 E4 F4 G4 G4 G4-
             G4 E4 E4- F4 D4 D4- C4 E4 G4 G4 E4 E4 E4-
             D4 D4 D4 D4 D4 E4 F4- E4 E4 E4 E4 E4 F4 G4-
             G4 E4 E4- F4 D4 D4- C4 E4 G4 G4 C4---`,
  },
  {
    id: 'birthday',
    name: '생일 축하합니다',
    by: '힐 자매',
    speed: 2.4,
    shift: 12,
    melody: `G4 G4 A4 G4 C5 B4- G4 G4 A4 G4 D5 C5-
             G4 G4 G5 E5 C5 B4 A4- F5 F5 E5 C5 D5 C5--`,
  },
  {
    id: 'london',
    name: '런던 다리',
    by: '영국 민요',
    speed: 2.6,
    shift: 12,
    melody: `G4 A4 G4 F4 E4 F4 G4- D4 E4 F4- E4 F4 G4-
             G4 A4 G4 F4 E4 F4 G4- D4- G4- E4 C4--`,
  },
  {
    id: 'ode',
    name: '환희의 송가',
    by: '베토벤',
    speed: 2.7,
    shift: 12,
    melody: `E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4-
             E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4-
             D4 D4 E4 C4 D4 E4 F4 E4 C4 D4 E4 F4 E4 D4 C4 D4 G3-
             E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4-`,
  },
  {
    id: 'lullaby',
    name: '브람스 자장가',
    by: '브람스',
    speed: 2.4,
    shift: 12,
    melody: `E4 E4 G4- E4 E4 G4- E4 G4 C5 B4- A4 A4 G4-
             D4 E4 F4 D4- D4 E4 F4- D4 F4 B4 A4 G4 B4 C5---`,
  },
  {
    id: 'jingle',
    name: '징글벨',
    by: '피어폰트',
    speed: 3,
    shift: 12,
    melody: `E4 E4 E4- E4 E4 E4- E4 G4 C4 D4 E4---
             F4 F4 F4 F4 F4 E4 E4 E4 E4 E4 D4 D4 E4 D4- G4-
             E4 E4 E4- E4 E4 E4- E4 G4 C4 D4 E4---
             F4 F4 F4 F4 F4 E4 E4 E4 E4 G4 G4 F4 D4 C4---`,
  },
  {
    id: 'silent',
    name: '고요한 밤 거룩한 밤',
    by: '그루버',
    speed: 3,
    shift: 12,
    melody: `G4 A4 G4 E4-- G4 A4 G4 E4-- D5- D5 B4-- C5- C5 G4--
             A4- A4 C5 B4 A4 G4 A4 G4 E4-- A4- A4 C5 B4 A4 G4 A4 G4 E4--
             D5- D5 F5 D5 B4 C5-- E5-- C5 G4 E4 G4 F4 D4 C4-----`,
  },
  {
    id: 'minuet',
    name: '미뉴에트 G장조',
    by: '페촐트',
    speed: 3.2,
    melody: `D5- G4 A4 B4 C5 D5- G4- G4- E5- C5 D5 E5 F#5 G5- G4- G4-
             C5- D5 C5 B4 A4 B4- C5 B4 A4 G4 F#4- G4 A4 B4 G4 A4-----
             D5- G4 A4 B4 C5 D5- G4- G4- E5- C5 D5 E5 F#5 G5- G4- G4-
             C5- D5 C5 B4 A4 B4- C5 B4 A4 G4 A4- B4 A4 G4 F#4 G4-----`,
  },
  {
    id: 'elise',
    name: '엘리제를 위하여',
    by: '베토벤',
    speed: 3.2,
    melody: `E5 D#5 E5 D#5 E5 B4 D5 C5 A4- C4 E4 A4 B4- E4 G#4 B4 C5-
             E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4- C4 E4 A4 B4- E4 C5 B4 A4--`,
  },
  {
    id: 'canon',
    name: '캐논',
    by: '파헬벨',
    speed: 3,
    melody: `F#5- E5- D5- C#5- B4- A4- B4- C#5- D5- C#5- B4- A4- G4- F#4- G4- E4-
             D4 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A4 G4 B4 A4 G4
             F#4 D4 E4 C#5 D5 F#5 A5 A4 B4 G4 A4 F#4 D4 D5 D5---`,
  },
  {
    id: 'turkish',
    name: '터키 행진곡',
    by: '모차르트',
    speed: 3.4,
    melody: `B4 A4 G#4 A4 C5- D5 C5 B4 C5 E5- F5 E5 D#5 E5
             B5 A5 G#5 A5 B5 A5 G#5 A5 C6---`,
  },
];

export const songById = (id: string | undefined) => SONGS.find((s) => s.id === id) ?? null;

const NAMES: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** "A4" → 69 (MIDI), or null */
export function midiOf(name: string): number | null {
  const m = name.match(/^([A-G]#?)(\d)$/);
  return m ? 12 * (Number(m[2]) + 1) + NAMES[m[1]] : null;
}

/** One row of the board: a tile with its note, or an empty row (null) */
export type Row = number | null;

/** The song as rows, bottom first */
export function songRows(song: Song): Row[] {
  const rows: Row[] = [];
  for (const token of song.melody.trim().split(/\s+/)) {
    const m = token.match(/^([A-G]#?\d)(-*)$/);
    const midi = m ? midiOf(m[1]) : null;
    if (midi === null) throw new Error(`Bad note "${token}" in ${song.id}`);
    rows.push(midi + (song.shift ?? 0));
    for (let i = 0; i < m![2].length; i++) rows.push(null);
  }
  return rows;
}

/** How hard a song feels on its first lap */
export const songLevel = (s: Song) => (s.speed <= 2.5 ? '쉬움' : s.speed <= 3 ? '보통' : '어려움');
