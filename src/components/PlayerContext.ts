import { createContext, useContext } from 'react';
import type { PlayerView } from './ui/Avatar';

/** The current player, so deep components (e.g. result cards) can show the nickname. */
export const PlayerContext = createContext<PlayerView>({ name: '게스트', emoji: '🌱', photo: null, isGuest: true });

export const usePlayer = () => useContext(PlayerContext);
