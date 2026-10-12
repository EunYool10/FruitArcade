import { UnlockedAchievements } from '../types';
import { ACHIEVEMENT_DEFINITIONS } from './achievements';

// Titles worn next to the nickname: every unlocked achievement becomes one, plus 주간 챔피언.
// Ids are stored on leaderboard entries, so firestore.rules only checks their format.

export const WEEKLY_CHAMPION = 'weekly_champion';

export interface TitleDef {
  id: string;
  label: string;
  icon: string;
}

const CHAMPION: TitleDef = { id: WEEKLY_CHAMPION, label: '주간 챔피언', icon: '👑' };

export function titleDef(id: string | undefined | null): TitleDef | null {
  if (!id) return null;
  if (id === WEEKLY_CHAMPION) return CHAMPION;
  const a = ACHIEVEMENT_DEFINITIONS.find((x) => x.id === id);
  return a ? { id, label: a.title, icon: a.icon } : null;
}

/** Titles this player has earned, 주간 챔피언 first */
export function earnedTitles(unlocked: UnlockedAchievements, wasChampion: boolean): TitleDef[] {
  const list = ACHIEVEMENT_DEFINITIONS.filter((a) => unlocked[a.id]).map((a) => ({ id: a.id, label: a.title, icon: a.icon }));
  return wasChampion ? [CHAMPION, ...list] : list;
}

/** The worn title, if the player still has it */
export function wornTitle(id: string, unlocked: UnlockedAchievements, wasChampion: boolean): TitleDef | null {
  if (!id) return null;
  if (id === WEEKLY_CHAMPION) return wasChampion ? CHAMPION : null;
  return unlocked[id] ? titleDef(id) : null;
}
