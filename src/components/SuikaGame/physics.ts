// Suika physics, kept apart from drawing so it can be tested on its own.
//
// The world advances in fixed 120 Hz ticks, so a 60 Hz PC, a 120 Hz phone and a slow
// tablet all see the same fruit do the same thing. Contacts are solved on positions
// (velocity comes from how far a fruit actually moved), which keeps piles still instead
// of trembling. Nothing ever "sleeps", so a fruit can't stay hanging in the air after
// the fruit under it merges away.

/** Length of one physics tick */
export const TICK_MS = 1000 / 120;
/** One tick measured in 60 fps frames: the speeds below are in px per frame */
const TICK = 0.5;
const SUBSTEPS = 2;
const ITERATIONS = 16;
const H = TICK / SUBSTEPS;

const GRAVITY = 0.38;
const MAX_SPEED = 13;
/** Speed kept per frame while touching something, and while falling freely */
const CONTACT_DAMP = 0.9;
const AIR_DAMP = 0.995;
/** Same fruit merge when they touch or come this close (px) */
const MERGE_GAP = 1.5;
/**
 * Fastest a fruit may move away from what pushed it out of an overlap (px per frame).
 * Pushes stop a fruit and let it roll, but never fling it: that was the bouncing.
 */
const MAX_SEPARATION = 0.5;
/** How fast a new fruit grows to full size (scale per tick) */
const GROW = 0.03;

export interface Bounds {
  left: number;
  right: number;
  bottom: number;
}

export interface Body {
  id: number;
  lv: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Where the body was at the start of the last tick, for drawing between ticks */
  px: number;
  py: number;
  pa: number;
  r: number;
  /** 1 / mass; mass grows with the fruit's area */
  inv: number;
  angle: number;
  /** Grows to 1 right after a drop or merge */
  scale: number;
  /** Has touched the floor or the pile (falling fruit never count as overflowing) */
  landed: boolean;
  // Scratch for the solver
  ox: number;
  oy: number;
  /** Velocity before contacts were solved this substep */
  vx0: number;
  vy0: number;
  touching: boolean;
  floor: boolean;
  wallL: boolean;
  wallR: boolean;
}

export interface World {
  bodies: Body[];
  bounds: Bounds;
  /** Radius of each fruit level */
  radii: number[];
  nextId: number;
  /** Same fruit that touched during this tick ("a:b" ids): they merge at its end */
  met: Set<string>;
  /** Off once the round is over: fruit still fall and settle, but twins just bump like any two fruit */
  merging: boolean;
}

/** Two fruit of level `lv` met. `made` is the new fruit, or null when two watermelons vanish. */
export interface Merge {
  lv: number;
  a: Body;
  b: Body;
  made: Body | null;
  x: number;
  y: number;
}

export function createWorld(bounds: Bounds, radii: number[]): World {
  return { bodies: [], bounds, radii, nextId: 1, met: new Set(), merging: true };
}

export function addBody(world: World, lv: number, x: number, y: number, opts: Partial<Pick<Body, 'vx' | 'vy' | 'scale' | 'landed' | 'angle'>> = {}): Body {
  const r = world.radii[lv];
  const { left, right, bottom } = world.bounds;
  const cx = Math.max(left + r, Math.min(right - r, x));
  const cy = Math.min(bottom - r, y);
  const body: Body = {
    id: world.nextId++,
    lv,
    x: cx,
    y: cy,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    px: cx,
    py: cy,
    pa: opts.angle ?? 0,
    r,
    inv: 1 / (r * r),
    angle: opts.angle ?? 0,
    scale: opts.scale ?? 1,
    landed: opts.landed ?? false,
    ox: cx,
    oy: cy,
    vx0: 0,
    vy0: 0,
    touching: false,
    floor: false,
    wallL: false,
    wallR: false,
  };
  world.bodies.push(body);
  return body;
}

/** Keeps the list ordered by left edge (it barely changes between passes, so this is cheap) */
function sortByLeft(bodies: Body[]) {
  for (let i = 1; i < bodies.length; i++) {
    const b = bodies[i];
    const key = b.x - b.r * b.scale;
    let j = i - 1;
    while (j >= 0 && bodies[j].x - bodies[j].r * bodies[j].scale > key) {
      bodies[j + 1] = bodies[j];
      j--;
    }
    bodies[j + 1] = b;
  }
}

/** Within this distance (px) a fruit counts as pressed against the floor or a wall */
const PINNED = 0.75;

function clampToJar(b: Body, bounds: Bounds) {
  const r = b.r * b.scale;
  if (b.x - r < bounds.left) b.x = bounds.left + r;
  else if (b.x + r > bounds.right) b.x = bounds.right - r;
  if (b.y + r > bounds.bottom) b.y = bounds.bottom - r;
  b.wallL = b.x - r <= bounds.left + PINNED;
  b.wallR = b.x + r >= bounds.right - PINNED;
  b.floor = b.y + r >= bounds.bottom - PINNED;
  if (b.floor) b.landed = true;
}

/** Move a body by k along (nx, ny), keep it in the jar, and return how far it really went along that line */
function push(b: Body, nx: number, ny: number, k: number, bounds: Bounds): number {
  const x0 = b.x;
  const y0 = b.y;
  b.x += nx * k;
  b.y += ny * k;
  clampToJar(b, bounds);
  return (b.x - x0) * nx + (b.y - y0) * ny;
}

function solveContacts(world: World) {
  const bodies = world.bodies;
  const { bounds } = world;
  for (const b of bodies) clampToJar(b, bounds);
  for (let it = 0; it < ITERATIONS; it++) {
    sortByLeft(bodies);
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      const ra = a.r * a.scale;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        const rb = b.r * b.scale;
        if (b.x - rb >= a.x + ra) break;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const min = ra + rb;
        let d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        a.touching = b.touching = true;
        // Touching the pile means the fruit has landed (two fruit still in the air do not count)
        if (a.landed || b.landed) a.landed = b.landed = true;
        // Twins are not pushed apart: they merge when the tick ends, even if they met fast
        if (a.lv === b.lv && world.merging) {
          world.met.add(a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`);
          continue;
        }
        if (d2 < 1e-6) {
          // Exactly on top of each other: nudge apart sideways
          dx = a.id < b.id ? -0.01 : 0.01;
          dy = 0;
          d2 = 1e-4;
        }
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const overlap = min - d;
        // Heavier fruit give way less. a moves along -n, b along +n; whatever the floor or a
        // wall stops one of them from moving is passed to the other, so a fruit pressed
        // into a corner can't be sunk into.
        const ka = (overlap * a.inv) / (a.inv + b.inv);
        const lostA = ka - push(a, -nx, -ny, ka, bounds);
        const kb = overlap - ka + lostA;
        const lostB = kb - push(b, nx, ny, kb, bounds);
        if (lostB > 1e-3) push(a, -nx, -ny, lostB, bounds);
      }
    }
  }
}

function findMerges(world: World): Merge[] {
  if (!world.merging) return [];
  const bodies = world.bodies;
  sortByLeft(bodies);
  const used = new Set<number>();
  const merges: Merge[] = [];
  const pair = (a: Body, b: Body) => {
    used.add(a.id);
    used.add(b.id);
    merges.push({ lv: a.lv, a, b, made: null, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  };
  // Twins that touched while contacts were solved
  if (world.met.size) {
    const byId = new Map(bodies.map((b) => [b.id, b]));
    for (const key of world.met) {
      const [a, b] = key.split(':').map((id) => byId.get(Number(id)));
      if (a && b && !used.has(a.id) && !used.has(b.id)) pair(a, b);
    }
    world.met.clear();
  }
  // Twins resting a hair apart
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (used.has(a.id)) continue;
    const ra = a.r * a.scale;
    const reach = a.x + ra + MERGE_GAP;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      const rb = b.r * b.scale;
      if (b.x - rb >= reach) break;
      if (b.lv !== a.lv || used.has(b.id)) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const near = ra + rb + MERGE_GAP;
      if (dx * dx + dy * dy > near * near) continue;
      pair(a, b);
      break;
    }
  }
  if (!merges.length) return merges;
  world.bodies = bodies.filter((b) => !used.has(b.id));
  for (const m of merges) {
    const next = m.lv + 1;
    if (next >= world.radii.length) continue;
    m.made = addBody(world, next, m.x, m.y, {
      vx: (m.a.vx + m.b.vx) * 0.25,
      vy: Math.min(0, (m.a.vy + m.b.vy) * 0.25) - 1.2,
      angle: (m.a.angle + m.b.angle) / 2,
      scale: 0.7,
      // Two fruit that meet in mid-air make a falling fruit, not part of the pile
      landed: m.a.landed || m.b.landed,
    });
    m.x = m.made.x;
    m.y = m.made.y;
  }
  return merges;
}

/** Advance one tick. Returns the merges that happened in it. */
export function stepWorld(world: World): Merge[] {
  for (const b of world.bodies) {
    b.px = b.x;
    b.py = b.y;
    b.pa = b.angle;
    if (b.scale < 1) b.scale = Math.min(1, b.scale + GROW);
  }
  for (let s = 0; s < SUBSTEPS; s++) {
    for (const b of world.bodies) {
      b.vy += GRAVITY * H;
      b.vx0 = b.vx;
      b.vy0 = b.vy;
      b.ox = b.x;
      b.oy = b.y;
      b.x += b.vx * H;
      b.y += b.vy * H;
      b.touching = false;
    }
    solveContacts(world);
    for (const b of world.bodies) {
      let vx = (b.x - b.ox) / H;
      let vy = (b.y - b.oy) / H;
      // What the contacts did (beyond the planned move) may cancel motion into them,
      // but must not throw the fruit back out
      const cx = vx - b.vx0;
      const cy = vy - b.vy0;
      const cl = Math.hypot(cx, cy);
      if (cl > 1e-9) {
        const out = (vx * cx + vy * cy) / cl;
        if (out > MAX_SEPARATION) {
          vx -= ((out - MAX_SEPARATION) * cx) / cl;
          vy -= ((out - MAX_SEPARATION) * cy) / cl;
        }
      }
      const resting = b.touching || b.floor;
      const damp = Math.pow(resting ? CONTACT_DAMP : AIR_DAMP, H);
      vx *= damp;
      vy *= resting ? damp : 1;
      const sp = Math.hypot(vx, vy);
      if (sp > MAX_SPEED) {
        vx *= MAX_SPEED / sp;
        vy *= MAX_SPEED / sp;
      }
      b.vx = vx;
      b.vy = vy;
      // Roll with the sideways motion
      b.angle += (vx / b.r) * H;
    }
  }
  return findMerges(world);
}

/** Take a body out of the jar (the hammer) */
export function removeBody(world: World, body: Body): void {
  world.bodies = world.bodies.filter((b) => b !== body);
}

/** The body under the point (x, y), the smallest one if several overlap there */
export function bodyAt(world: World, x: number, y: number, slack = 0): Body | null {
  let hit: Body | null = null;
  for (const b of world.bodies) {
    const r = b.r * b.scale + slack;
    if ((b.x - x) ** 2 + (b.y - y) ** 2 <= r * r && (!hit || b.r < hit.r)) hit = b;
  }
  return hit;
}

/** Position to draw a body at, `t` (0..1) of the way through the next tick */
export function drawPos(b: Body, t: number): { x: number; y: number; angle: number } {
  return { x: b.px + (b.x - b.px) * t, y: b.py + (b.y - b.py) * t, angle: b.pa + (b.angle - b.pa) * t };
}
