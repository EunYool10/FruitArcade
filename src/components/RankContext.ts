import { createContext, useContext } from 'react';
import type { GameType } from '../types';
import type { RankResult } from '../utils/ranking';

interface RankApi {
  /** Ranks for the round that just ended (null for guests or a zero score) */
  result: RankResult | null;
  signedIn: boolean;
  /** Open the leaderboard on a game's boards */
  open: (game: GameType) => void;
}

export const RankContext = createContext<RankApi>({ result: null, signedIn: false, open: () => {} });

export const useRank = () => useContext(RankContext);
