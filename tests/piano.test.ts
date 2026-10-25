import { describe, expect, it } from 'vitest';
import { SONGS, songLap } from '../src/components/PianoGame/songs';
import { checkRound } from '../server/verify';

describe('과일 피아노 songs', () => {
  it('have unique ids short enough for a challenge seed (24 characters with the random part)', () => {
    const ids = SONGS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]{1,10}$/);
  });

  it('parse into tiles that start the song, never overlap and stay in a pleasant range', () => {
    for (const song of SONGS) {
      const lap = songLap(song);
      expect(lap.tiles[0].row, song.id).toBe(0);
      expect(lap.tiles.length, song.id).toBeGreaterThanOrEqual(20);
      lap.tiles.forEach((t, i) => {
        expect(t.note, song.id).toBeGreaterThanOrEqual(55);
        expect(t.note, song.id).toBeLessThanOrEqual(96);
        if (i > 0) expect(t.row, song.id).toBeGreaterThanOrEqual(lap.tiles[i - 1].row + lap.tiles[i - 1].len);
      });
      expect(lap.tiles.some((t) => t.len > 1), `${song.id} has a long tile`).toBe(true);
    }
  });

  it('have chords for exactly as many rows as the melody', () => {
    for (const song of SONGS) {
      const chordRows = song.chords
        .trim()
        .split(/\s+/)
        .reduce((n, part) => n + Number(part.split(':')[1]), 0);
      expect(chordRows, song.id).toBe(songLap(song).rows);
    }
  });

  it('give the left hand something to play in every song, below the tune', () => {
    for (const song of SONGS) {
      const notes = songLap(song).left.flat();
      expect(notes.length, song.id).toBeGreaterThan(10);
      for (const n of notes) expect(n, song.id).toBeLessThan(72);
    }
  });
});

describe('과일 피아노 score check', () => {
  const round = (score: number, seconds: number) => checkRound({ game: 'piano', score, seconds, wallSeconds: seconds });

  it('takes a fast but possible round', () => expect(round(300, 30)).toBeNull());
  it('refuses more points than the board can scroll', () => expect(round(1000, 30)).toBe('rate'));
});
