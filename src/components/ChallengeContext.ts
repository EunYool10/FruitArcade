import { createContext, useContext } from 'react';
import type { GameType } from '../types';
import type { Challenge } from '../utils/challenge';

interface ChallengeApi {
  /** The friend challenge being played right now, if any */
  active: Challenge | null;
  /** Link that lets a friend play the same board as the last round of `game` */
  linkFor: (game: GameType, score: number) => string;
}

export const ChallengeContext = createContext<ChallengeApi>({
  active: null,
  linkFor: () => window.location.origin + window.location.pathname,
});

export const useChallenge = () => useContext(ChallengeContext);
