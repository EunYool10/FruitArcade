import { describe, expect, it } from 'vitest';
import { GRID, Pixels, compare, family } from '../src/components/FruitDrawGame/similarity';

type RGB = [number, number, number];
const RED: RGB = [230, 40, 50];
const GREEN: RGB = [60, 170, 70];
const BLUE: RGB = [50, 90, 230];

/** A blank GRID×GRID picture and a way to paint cells */
function picture(paint: (set: (x: number, y: number, c: RGB) => void) => void): Pixels {
  const data = new Uint8ClampedArray(GRID * GRID * 4);
  const set = (x: number, y: number, [r, g, b]: RGB) => {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    const i = (Math.round(y) * GRID + Math.round(x)) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  paint(set);
  return { size: GRID, data };
}

const C = GRID / 2;
/** An apple: a red ball with a green leaf on top */
const apple = (body: RGB, outlineOnly = false) =>
  picture((set) => {
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const d = Math.hypot(x - C, y - C - 3);
        if (outlineOnly ? Math.abs(d - 18) < 1.2 : d < 18) set(x, y, body);
        if (Math.hypot(x - C - 3, y - 4) < 4) set(x, y, GREEN);
      }
  });

describe('과일 그리기 싱크율', () => {
  const ref = apple(RED);

  it('gives the picture itself 100', () => {
    expect(compare(apple(RED), ref).sync).toBe(100);
  });

  it('counts an outline as the shape it closes in', () => {
    const outline = compare(apple(RED, true), ref);
    expect(outline.shape).toBeGreaterThan(0.7);
    expect(outline.sync).toBeGreaterThanOrEqual(60);
  });

  it('scores the right colour above the wrong one', () => {
    expect(compare(apple(RED, true), ref).sync).toBeGreaterThan(compare(apple(BLUE), ref).sync);
  });

  it('gives a scribble little and a blank page nothing', () => {
    const scribble = picture((set) => {
      for (let x = 4; x < 44; x++) set(x, 10 + Math.sin(x / 3) * 4, BLUE);
    });
    expect(compare(scribble, ref).sync).toBeLessThan(25);
    expect(compare(picture(() => {}), ref).sync).toBe(0);
  });

  it('sorts colours into families', () => {
    expect(family(...RED)).toBe(0);
    expect(family(...GREEN)).toBe(4);
    expect(family(20, 20, 20)).toBe(12);
    expect(family(250, 250, 250)).toBe(13);
  });
});
