import { describe, expect, it } from 'vitest';
import { addBody, createWorld, stepWorld, type Merge } from '../src/components/SuikaGame/physics';

// Same sizes and jar as the game (SuikaGame.tsx)
const RADII = [17, 24, 32, 41, 50, 60, 71, 83, 96, 110, 126];
const WATERMELON = RADII.length - 1;
const jar = () => createWorld({ left: 20, right: 508, bottom: 700 }, RADII);
const run = (world: ReturnType<typeof jar>, ticks: number) => {
  const merges: Merge[] = [];
  for (let i = 0; i < ticks; i++) merges.push(...stepWorld(world));
  return merges;
};

describe('suika physics', () => {
  it('two watermelons side by side both stay (they used to vanish)', () => {
    const w = jar();
    addBody(w, WATERMELON, 150, 574, { landed: true });
    addBody(w, WATERMELON, 390, 574, { landed: true });
    const merges = run(w, 600);
    expect(merges).toHaveLength(0);
    expect(w.bodies.filter((b) => b.lv === WATERMELON)).toHaveLength(2);
  });

  it('a watermelon dropped on another stays on top', () => {
    const w = jar();
    addBody(w, WATERMELON, 264, 574, { landed: true });
    addBody(w, WATERMELON, 264, 200);
    expect(run(w, 900)).toHaveLength(0);
    expect(w.bodies).toHaveLength(2);
  });

  it('two melons still make a watermelon', () => {
    const w = jar();
    addBody(w, WATERMELON - 1, 200, 590, { landed: true });
    addBody(w, WATERMELON - 1, 320, 590, { landed: true });
    const merges = run(w, 600);
    expect(merges.map((m) => m.made?.lv)).toEqual([WATERMELON]);
  });

  it('twins merge into the next size up, everything else bumps', () => {
    const w = jar();
    addBody(w, 0, 250, 680, { landed: true });
    addBody(w, 0, 280, 500);
    addBody(w, 3, 400, 500);
    const merges = run(w, 900);
    expect(merges.map((m) => m.made?.lv)).toEqual([1]);
    expect(w.bodies.map((b) => b.lv).sort()).toEqual([1, 3]);
  });

  it('nothing merges once the round is over, but fruit still fall', () => {
    const w = jar();
    w.merging = false;
    addBody(w, 2, 250, 668, { landed: true });
    const falling = addBody(w, 2, 252, 300);
    expect(run(w, 900)).toHaveLength(0);
    expect(falling.y).toBeGreaterThan(500);
  });
});
