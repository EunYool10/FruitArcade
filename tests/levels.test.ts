import { describe, expect, it } from 'vitest';
import { ADMIN_LEVEL, LEVEL_MAX, LEVEL_MILESTONES, adminLevel, levelInfo, levelUpCoins, xpForLevel } from '../src/utils/progress';
import { RGB_PRICE, SHOP_ITEMS, forSale, mergeInventory, usableItems } from '../src/utils/shop';

describe('levels', () => {
  it('stop at Lv.100 for players, with the bar full', () => {
    const top = levelInfo(xpForLevel(150));
    expect(top.level).toBe(LEVEL_MAX);
    expect(top.max).toBe(true);
    expect(top.next).toBe(top.floor);
    const mid = levelInfo(xpForLevel(42) + 10);
    expect(mid.level).toBe(42);
    expect(mid.max).toBe(false);
  });

  it('show Lv.999 for admins', () => {
    const a = adminLevel(levelInfo(1234));
    expect(a.level).toBe(ADMIN_LEVEL);
    expect(a.max).toBe(true);
  });

  it('pay 100 coins a level, more at the milestones', () => {
    expect(levelUpCoins(2)).toBe(100);
    expect(levelUpCoins(10)).toBe(1100);
    expect(levelUpCoins(100)).toBe(10100);
  });

  it('give each milestone a reward item, never sold or stored', () => {
    const rewards = SHOP_ITEMS.filter((i) => i.level);
    for (const lv of LEVEL_MILESTONES) expect(rewards.some((i) => i.level === lv), `Lv.${lv}`).toBe(true);
    for (const i of rewards) {
      expect(forSale(i)).toBe(false);
      expect(i.id.startsWith('lv_')).toBe(true);
    }
    expect(mergeInventory({ lv_frame_10: 'x' }, {})).toEqual({});
    expect(usableItems({}, false, [], 10).lv_frame_10).toBe('level');
    expect(usableItems({}, false, [], 9).lv_frame_10).toBeUndefined();
    expect(usableItems({}, true, [], 1).lv_frame_100).toBe('level');
  });
});

describe('RGB series', () => {
  it('sells the avatar, title and card back for 777억; the frame is an admins’ gift', () => {
    const rgb = SHOP_ITEMS.filter((i) => i.rgb);
    expect(rgb.map((i) => i.kind).sort()).toEqual(['avatar', 'cardBack', 'frame', 'title']);
    for (const i of rgb) {
      if (i.kind === 'frame') expect(forSale(i)).toBe(false);
      else expect([forSale(i), i.price]).toEqual([true, RGB_PRICE]);
    }
  });
});
