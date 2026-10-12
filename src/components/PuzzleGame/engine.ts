// Match-3 rules for 과일 퍼즐 — pure functions, no React
import { Rng } from '../../utils/rng';

export const W = 7;
export const H = 7;
export const KINDS = 6;
export const FRUIT = ['🍓', '🍊', '🍋', '🍇', '🍏', '🫐'];
export const FRUIT_NAME = ['딸기', '귤', '레몬', '포도', '사과', '블루베리'];
export const FRUIT_COLOR = ['#ff4778', '#ff9f1c', '#ffd23f', '#9b5de5', '#7bd389', '#4361ee'];

/** row / col: clears its whole row or column; bomb: clears the 3×3 around it */
export type Special = 'row' | 'col' | 'bomb';

export interface Tile {
  id: number;
  kind: number;
  special?: Special;
  /** Rows this tile falls in from above when it appears (for the drop animation) */
  drop: number;
}

export type Grid = (Tile | null)[];

let nextId = 1;
export const makeTile = (kind: number, special?: Special, drop = 0): Tile => ({ id: nextId++, kind, special, drop });

export const idx = (x: number, y: number) => y * W + x;
export const pos = (i: number) => ({ x: i % W, y: Math.floor(i / W) });
export const adjacent = (a: number, b: number) => {
  const p = pos(a);
  const q = pos(b);
  return Math.abs(p.x - q.x) + Math.abs(p.y - q.y) === 1;
};

const kindAt = (g: Grid, x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : (g[idx(x, y)]?.kind ?? -1));

export function swapped(g: Grid, a: number, b: number): Grid {
  const c = g.slice();
  [c[a], c[b]] = [c[b], c[a]];
  return c;
}

interface Run {
  cells: number[];
  dir: 'h' | 'v';
}

/** Every straight line of 3+ equal fruit */
export function findRuns(g: Grid): Run[] {
  const runs: Run[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; ) {
      const k = kindAt(g, x, y);
      let e = x + 1;
      while (k >= 0 && e < W && kindAt(g, e, y) === k) e++;
      if (k >= 0 && e - x >= 3) runs.push({ cells: Array.from({ length: e - x }, (_, i) => idx(x + i, y)), dir: 'h' });
      x = e;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; ) {
      const k = kindAt(g, x, y);
      let e = y + 1;
      while (k >= 0 && e < H && kindAt(g, x, e) === k) e++;
      if (k >= 0 && e - y >= 3) runs.push({ cells: Array.from({ length: e - y }, (_, i) => idx(x, y + i)), dir: 'v' });
      y = e;
    }
  }
  return runs;
}

/** A swap that makes a match, or null when the board is stuck */
export function findMove(g: Grid): [number, number] | null {
  for (let i = 0; i < W * H; i++) {
    const { x, y } = pos(i);
    for (const j of [x + 1 < W ? i + 1 : -1, y + 1 < H ? i + W : -1]) {
      if (j >= 0 && findRuns(swapped(g, i, j)).length) return [i, j];
    }
  }
  return null;
}

/** Fresh board: no ready-made matches and at least one possible move */
export function generate(rng: Rng): Grid {
  for (;;) {
    const g: Grid = new Array(W * H).fill(null);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let k: number;
        do {
          k = Math.floor(rng() * KINDS);
        } while ((kindAt(g, x - 1, y) === k && kindAt(g, x - 2, y) === k) || (kindAt(g, x, y - 1) === k && kindAt(g, x, y - 2) === k));
        g[idx(x, y)] = makeTile(k, undefined, H);
      }
    }
    if (findMove(g)) return g;
  }
}

export interface ClearStep {
  /** Cells emptied this step */
  cleared: number[];
  created: { at: number; special: Special }[];
  /** Board with the cleared cells empty and new specials placed */
  grid: Grid;
  bombs: number;
  lines: number;
}

/**
 * One round of matching. `focus` are the swapped cells, where new specials prefer to appear.
 * Specials caught in a clear go off and can set off other specials.
 */
export function clearStep(g: Grid, focus: number[]): ClearStep | null {
  const runs = findRuns(g);
  if (!runs.length) return null;

  const clear = new Set<number>();
  const hits = new Map<number, number>();
  for (const r of runs) for (const c of r.cells) hits.set(c, (hits.get(c) || 0) + 1);

  const created: { at: number; special: Special; kind: number }[] = [];
  for (const r of runs) {
    r.cells.forEach((c) => clear.add(c));
    const cross = r.cells.find((c) => (hits.get(c) || 0) > 1);
    const special: Special | null =
      r.cells.length >= 5 || cross !== undefined ? 'bomb' : r.cells.length === 4 ? (r.dir === 'h' ? 'row' : 'col') : null;
    if (!special) continue;
    const at = r.cells.find((c) => focus.includes(c)) ?? cross ?? r.cells[Math.floor(r.cells.length / 2)];
    if (!created.some((c) => c.at === at)) created.push({ at, special, kind: g[at]!.kind });
  }

  let bombs = 0;
  let lines = 0;
  const queue = [...clear];
  const fired = new Set<number>();
  while (queue.length) {
    const c = queue.pop()!;
    const t = g[c];
    if (!t?.special || fired.has(c)) continue;
    fired.add(c);
    const { x, y } = pos(c);
    const area: number[] = [];
    if (t.special === 'row') {
      lines++;
      for (let i = 0; i < W; i++) area.push(idx(i, y));
    } else if (t.special === 'col') {
      lines++;
      for (let j = 0; j < H; j++) area.push(idx(x, j));
    } else {
      bombs++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (kindAt(g, x + dx, y + dy) >= 0) area.push(idx(x + dx, y + dy));
    }
    for (const a of area) {
      if (!clear.has(a)) {
        clear.add(a);
        queue.push(a);
      }
    }
  }

  const grid = g.slice();
  for (const c of clear) grid[c] = null;
  for (const cr of created) grid[cr.at] = makeTile(cr.kind, cr.special);
  return {
    cleared: [...clear].filter((c) => !created.some((cr) => cr.at === c)),
    created: created.map(({ at, special }) => ({ at, special })),
    grid,
    bombs,
    lines,
  };
}

/** Let fruit fall into the gaps and fill the top with new fruit */
export function collapse(g: Grid, rng: Rng): Grid {
  const next: Grid = new Array(W * H).fill(null);
  for (let x = 0; x < W; x++) {
    let write = H - 1;
    for (let y = H - 1; y >= 0; y--) {
      const t = g[idx(x, y)];
      if (t) next[idx(x, write--)] = { ...t, drop: 0 };
    }
    const missing = write + 1;
    for (let y = write; y >= 0; y--) next[idx(x, y)] = makeTile(Math.floor(rng() * KINDS), undefined, missing);
  }
  return next;
}

/** Rearrange the same fruit until there is a move and no ready-made match */
export function reshuffle(g: Grid, rng: Rng): Grid {
  const tiles = g.filter((t): t is Tile => !!t);
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    const next: Grid = tiles.map((t) => ({ ...t, drop: 0 }));
    if (!findRuns(next).length && findMove(next)) return next;
  }
  return generate(rng);
}
