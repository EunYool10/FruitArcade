// 과일 그리기 싱크율: how much a drawing looks like the fruit's picture, 0–100.
// Both come in cropped to what's drawn and scaled into the same GRID×GRID square (see the game).
// Three parts: the shape (an outline counts as the filled shape it closes), the colours used,
// and whether the colours sit in the right places (a green leaf on top of a strawberry).

/** RGBA pixels of a GRID×GRID picture */
export interface Pixels {
  size: number;
  data: Uint8ClampedArray;
}

export const GRID = 48;

/** Cells with ink: alpha above `min` */
export function maskOf(p: Pixels, min: number): Uint8Array {
  const out = new Uint8Array(p.size * p.size);
  for (let i = 0; i < out.length; i++) out[i] = p.data[i * 4 + 3] > min ? 1 : 0;
  return out;
}

const count = (m: Uint8Array) => m.reduce((n, v) => n + v, 0);

function dilate(m: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!m[y * size + x]) continue;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < size && ny < size) out[ny * size + nx] = 1;
        }
    }
  return out;
}

/** The ink plus every area it closes in (small gaps in an outline are closed first) */
export function silhouette(ink: Uint8Array, size: number): Uint8Array {
  const wall = dilate(ink, size);
  const outside = new Uint8Array(ink.length);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const i = y * size + x;
    if (!wall[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let i = 0; i < size; i++) {
    push(i, 0);
    push(i, size - 1);
    push(0, i);
    push(size - 1, i);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % size;
    const y = (i - x) / size;
    if (x > 0) push(x - 1, y);
    if (x < size - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < size - 1) push(x, y + 1);
  }
  // Shrink back the cell the gap-closing added around the outside, keeping all the ink
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < size && y < size && !outside[y * size + x];
  const out = new Uint8Array(ink.length);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let core = inside(x, y);
      for (let dy = -1; dy <= 1 && core; dy++) for (let dx = -1; dx <= 1 && core; dx++) core = inside(x + dx, y + dy);
      out[i] = core || ink[i] ? 1 : 0;
    }
  return out;
}

/** Cells of a shape that touch the outside (or the edge) */
function edgeOf(m: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(m.length);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (!m[i]) continue;
      out[i] = x === 0 || y === 0 || x === size - 1 || y === size - 1 || !m[i - 1] || !m[i + 1] || !m[i - size] || !m[i + size] ? 1 : 0;
    }
  return out;
}

/** Distance (in cells) from every cell to the nearest set one: two passes with 3-4 steps */
function distanceTo(m: Uint8Array, size: number): Float64Array {
  const d = new Float64Array(m.length).fill(1e9);
  for (let i = 0; i < m.length; i++) if (m[i]) d[i] = 0;
  const step = (i: number, j: number, w: number) => {
    if (d[j] + w < d[i]) d[i] = d[j] + w;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (x > 0) step(i, i - 1, 3);
      if (y > 0) {
        step(i, i - size, 3);
        if (x > 0) step(i, i - size - 1, 4);
        if (x < size - 1) step(i, i - size + 1, 4);
      }
    }
  for (let y = size - 1; y >= 0; y--)
    for (let x = size - 1; x >= 0; x--) {
      const i = y * size + x;
      if (x < size - 1) step(i, i + 1, 3);
      if (y < size - 1) {
        step(i, i + size, 3);
        if (x < size - 1) step(i, i + size + 1, 4);
        if (x > 0) step(i, i + size - 1, 4);
      }
    }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/** How close the two outlines run: 1 when they lie on each other, 0 when ~6 cells apart on average */
export function outlineMatch(a: Uint8Array, b: Uint8Array, size: number): number {
  const ea = edgeOf(a, size);
  const eb = edgeOf(b, size);
  const na = count(ea);
  const nb = count(eb);
  if (!na || !nb) return 0;
  const da = distanceTo(ea, size);
  const db = distanceTo(eb, size);
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < ea.length; i++) {
    if (ea[i]) sa += db[i];
    if (eb[i]) sb += da[i];
  }
  const avg = (sa / na + sb / nb) / 2;
  return Math.max(0, 1 - avg / 6);
}

/** Each 2×2 block becomes one cell, set if any of it was */
function halve(m: Uint8Array, size: number): Uint8Array {
  const h = size / 2;
  const out = new Uint8Array(h * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < h; x++) {
      const i = 2 * y * size + 2 * x;
      out[y * h + x] = m[i] | m[i + 1] | m[i + size] | m[i + size + 1];
    }
  return out;
}

export function iou(a: Uint8Array, b: Uint8Array): number {
  let both = 0;
  let any = 0;
  for (let i = 0; i < a.length; i++) {
    both += a[i] & b[i];
    any += a[i] | b[i];
  }
  return any ? both / any : 0;
}

/** Colour families: 0–11 hue sectors of 30°, 12 dark, 13 white, 14 grey */
export const FAMILIES = 15;
export function family(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max < 0.2) return 12;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (s < 0.2) return l > 0.82 ? 13 : 14;
  let h: number;
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  if (max === R) h = ((G - B) / d) % 6;
  else if (max === G) h = (B - R) / d + 2;
  else h = (R - G) / d + 4;
  h = (h * 60 + 360) % 360;
  // Rotate so pure red sits in the middle of sector 0
  return Math.floor(((h + 15) % 360) / 30);
}

const isHue = (f: number) => f < 12;
/** Same family 1, neighbouring hues (red ↔ orange) 0.5, otherwise 0 */
function closeness(a: number, b: number): number {
  if (a === b) return 1;
  if (isHue(a) && isHue(b)) {
    const d = Math.min((a - b + 12) % 12, (b - a + 12) % 12);
    return d === 1 ? 0.5 : 0;
  }
  // Dark and grey are close (shading, seeds)
  return (a === 12 && b === 14) || (a === 14 && b === 12) ? 0.5 : 0;
}

/** Share of each colour family among the inked cells, a little spread to neighbouring hues */
export function histogram(p: Pixels, mask: Uint8Array): Float64Array {
  const h = new Float64Array(FAMILIES);
  let n = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    const f = family(p.data[i * 4], p.data[i * 4 + 1], p.data[i * 4 + 2]);
    if (isHue(f)) {
      h[f] += 0.7;
      h[(f + 1) % 12] += 0.15;
      h[(f + 11) % 12] += 0.15;
    } else h[f] += 1;
    n++;
  }
  if (n) for (let i = 0; i < FAMILIES; i++) h[i] /= n;
  return h;
}

export function colorMatch(a: Float64Array, b: Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.min(a[i], b[i]);
  return Math.min(1, s);
}

/** In a 4×4 grid: where the picture shows a colour, did the drawing put a colour like it there? */
export function layoutMatch(draw: Pixels, drawInk: Uint8Array, ref: Pixels, refMask: Uint8Array): number {
  const size = ref.size;
  const cell = size / 4;
  let total = 0;
  let got = 0;
  for (let cy = 0; cy < 4; cy++)
    for (let cx = 0; cx < 4; cx++) {
      const refCount = new Float64Array(FAMILIES);
      const drawn = new Set<number>();
      let filled = 0;
      for (let y = cy * cell; y < (cy + 1) * cell; y++)
        for (let x = cx * cell; x < (cx + 1) * cell; x++) {
          const i = y * size + x;
          if (refMask[i]) {
            refCount[family(ref.data[i * 4], ref.data[i * 4 + 1], ref.data[i * 4 + 2])]++;
            filled++;
          }
          if (drawInk[i]) drawn.add(family(draw.data[i * 4], draw.data[i * 4 + 1], draw.data[i * 4 + 2]));
        }
      if (filled < cell * cell * 0.15) continue;
      let main = 0;
      for (let f = 1; f < FAMILIES; f++) if (refCount[f] > refCount[main]) main = f;
      total++;
      let best = 0;
      for (const f of drawn) best = Math.max(best, closeness(main, f));
      got += best;
    }
  return total ? got / total : 0;
}

/** The parts, for the result screen and tests */
export function compare(draw: Pixels, ref: Pixels) {
  const ink = maskOf(draw, 40);
  const refMask = maskOf(ref, 128);
  if (count(ink) < draw.size * draw.size * 0.006) return { shape: 0, color: 0, layout: 0, sync: 0 };
  const body = silhouette(ink, draw.size);
  const refBody = silhouette(refMask, ref.size);
  // Overlap (forgiving, also at half size) and how closely the outlines run (catches corners on a round fruit)
  const overlap = 0.5 * iou(body, refBody) + 0.5 * iou(halve(body, draw.size), halve(refBody, ref.size));
  const shape = 0.5 * overlap + 0.5 * outlineMatch(body, refBody, draw.size);
  const color = colorMatch(histogram(draw, ink), histogram(ref, refMask));
  const layout = layoutMatch(draw, ink, ref, refMask);
  const raw = 0.5 * shape + 0.3 * color + 0.2 * layout;
  // A scribble lands at 0, the right shape in the wrong colour around 30, a careful copy near 100
  const sync = Math.round(100 * Math.pow(Math.max(0, Math.min(1, (raw - 0.25) / 0.75)), 1.25));
  return { shape, color, layout, sync };
}
