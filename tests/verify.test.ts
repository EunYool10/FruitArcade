import { describe, expect, it } from 'vitest';
import { TICKET_SLACK_SECONDS, checkRound } from '../server/verify';

const claim = (game: string, score: number, seconds: number, wallSeconds = seconds + 5) => ({ game, score, seconds, wallSeconds });

describe('score server round check', () => {
  it('takes believable rounds', () => {
    expect(checkRound(claim('suika', 99_929, 1351))).toBeNull();
    expect(checkRound(claim('suika', 136_742, 1709))).toBeNull();
    expect(checkRound(claim('dash', 2894, 120))).toBeNull();
  });

  it('refuses unknown games, bad numbers and scores over the cap', () => {
    expect(checkRound(claim('chess', 10, 10))).toBe('game');
    expect(checkRound(claim('suika', 0, 10))).toBe('score');
    expect(checkRound(claim('suika', 1.5, 10))).toBe('score');
    expect(checkRound(claim('suika', 500_001, 4000))).toBe('score');
    expect(checkRound(claim('suika', 100, -1))).toBe('seconds');
  });

  it('refuses rounds longer than the time since their ticket', () => {
    expect(checkRound(claim('suika', 1000, 600, 600 - TICKET_SLACK_SECONDS - 1))).toBe('time');
    expect(checkRound(claim('suika', 1000, 600, 600 - TICKET_SLACK_SECONDS + 1))).toBeNull();
  });

  it('refuses points faster than a game allows', () => {
    expect(checkRound(claim('suika', 500_000, 60))).toBe('rate');
    expect(checkRound(claim('memory', 2000, 5))).toBe('rate');
  });

  it('replays classic puzzle rounds instead of trusting the score', () => {
    expect(checkRound({ ...claim('puzzle', 100, 30), replay: { seed: 'abc', moves: [] } })).toBe('replay');
    expect(checkRound({ ...claim('puzzle', 100, 30), replay: { seed: 'abc', moves: [[0, 99]] } })).toBe('replay');
  });
});
