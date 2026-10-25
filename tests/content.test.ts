import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FRAME_CLASS, PRISM_FRAME, SHOP_ITEMS, isOwnerGiftId, isStaffId, mergeInventory, usableItems } from '../src/utils/shop';
import { SUIKA_DEFAULT, SUIKA_SKINS, skinPiece } from '../src/utils/skins';
import { emojiSrc } from '../src/utils/emoji';
import { AVATARS } from '../src/utils/profile';
import { ACHIEVEMENT_DEFINITIONS } from '../src/utils/achievements';

describe('shop', () => {
  it('has unique ids, and every staff item is marked and prefixed', () => {
    const ids = SHOP_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of SHOP_ITEMS) expect(!!i.staff).toBe(isStaffId(i.id));
  });

  it('keeps the admins\' gifts out of the shop and the stored inventory', () => {
    for (const i of SHOP_ITEMS) expect(!!i.gift).toBe(isOwnerGiftId(i.id));
    expect(FRAME_CLASS[PRISM_FRAME]).toBe('frame-prism');
    expect(mergeInventory({ [PRISM_FRAME]: 'x', frame_gold: 'y' }, {})).toEqual({ frame_gold: 'y' });
    expect(usableItems({ [PRISM_FRAME]: 'x' }, false)[PRISM_FRAME]).toBeUndefined();
    expect(usableItems({}, false, [PRISM_FRAME])[PRISM_FRAME]).toBe('gift');
    expect(usableItems({}, true)[PRISM_FRAME]).toBe('gift');
  });

  it('fits the inventory cap in firestore.rules (200 keys) with room to spare', () => {
    expect(SHOP_ITEMS.filter((i) => !i.staff).length).toBeLessThanOrEqual(180);
  });

  it('only sells ids the rules accept on boards ([a-z0-9_]{1,32})', () => {
    for (const i of SHOP_ITEMS) expect(i.id).toMatch(/^[a-z0-9_]{1,32}$/);
  });
});

describe('pictures', () => {
  it('public/emoji matches the list in emoji.ts', () => {
    const files = readdirSync('public/emoji').filter((f) => f.endsWith('.svg'));
    for (const f of files) expect(emojiSrc(String.fromCodePoint(...f.slice(0, -4).split('-').map((h) => parseInt(h, 16)))), f).not.toBeNull();
  });

  it('every avatar and skin piece has a picture', () => {
    const avatars = [...AVATARS, ...SHOP_ITEMS.filter((i) => i.kind === 'avatar').map((i) => i.icon!)];
    const pieces = [SUIKA_DEFAULT, ...Object.values(SUIKA_SKINS)].flatMap((s) => s.emojis);
    for (const e of [...avatars, ...pieces]) expect(emojiSrc(e), e).not.toBeNull();
  });
});

describe('fruit skins', () => {
  it('every skin has 11 different pieces with names, and a shop item', () => {
    for (const [id, skin] of Object.entries(SUIKA_SKINS)) {
      expect(skin.emojis).toHaveLength(11);
      expect(skin.names).toHaveLength(11);
      expect(new Set(skin.emojis).size).toBe(11);
      expect(SHOP_ITEMS.some((i) => i.id === id && i.kind === 'suikaSkin'), id).toBe(true);
    }
  });

  it('keeps a game’s fruit apart and leaves bombs alone', () => {
    const fruit = ['🍓', '🍊', '🍋', '🍇', '🍏', '🫐'];
    const skinned = fruit.map((f) => skinPiece('skin_animal', fruit, f));
    expect(new Set(skinned).size).toBe(fruit.length);
    expect(skinPiece('skin_animal', fruit, '💣')).toBe('💣');
    expect(skinPiece('', fruit, '🍓')).toBe('🍓');
  });
});

describe('achievements', () => {
  it('fit the public card (60) and the rules map (100), with unique ids', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeLessThanOrEqual(60);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9_]{1,32}$/);
  });
});
