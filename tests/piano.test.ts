import { describe, expect, it } from 'vitest';
import { SONGS, songRows } from '../src/components/PianoGame/songs';
import { checkRound } from '../server/verify';

describe('과일 피아노 songs', () => {
  it('have unique ids short enough for a challenge seed (24 characters with the random part)', () => {
    const ids = SONGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]{1,10}$/);
  });

  it('parse into rows that start with a tile and stay in a pleasant range', () => {
    for (const song of SONGS) {
      const rows = songRows(song);
      expect(rows[0], song.id).not.toBeNull();
      const notes = rows.filter((r): r is number => r !== null);
      expect(notes.length, song.id).toBeGreaterThanOrEqual(15);
      for (const n of notes) {
        expect(n, song.id).toBeGreaterThanOrEqual(55);
        expect(n, song.id).toBeLessThanOrEqual(96);
      }
    }
  });
});

describe('과일 피아노 score check', () => {
  const round = (score: number, seconds: number) => checkRound({ game: 'piano', score, seconds, wallSeconds: seconds });

  it('takes a fast but possible round', () => expect(round(300, 30)).toBeNull());
  it('refuses more tiles than the board can scroll', () => expect(round(1000, 30)).toBe('rate'));
});
