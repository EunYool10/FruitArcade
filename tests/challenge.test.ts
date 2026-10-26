import { describe, expect, it } from 'vitest';
import { decodeChallenge, encodeChallenge } from '../src/utils/challenge';
import { GameType } from '../src/types';

const levelAfterLink = (g: GameType, d: unknown) =>
  decodeChallenge(encodeChallenge({ g, s: 'seed', sc: 100, n: '친구', d } as Parameters<typeof encodeChallenge>[0]))?.d;

describe('challenge links', () => {
  it('carry the difficulty of FRUIT DASH and 과일 자르기', () => {
    expect(levelAfterLink('slice', 'hard')).toBe('hard');
    expect(levelAfterLink('slice', 'easy')).toBe('easy');
    expect(levelAfterLink('dash', 'normal')).toBe('normal');
  });

  it('drop a difficulty other games or odd values put in', () => {
    expect(levelAfterLink('memory', 'hard')).toBeUndefined();
    expect(levelAfterLink('piano', 'easy')).toBeUndefined();
    expect(levelAfterLink('slice', 'impossible')).toBeUndefined();
    expect(levelAfterLink('slice', undefined)).toBeUndefined();
  });
});
