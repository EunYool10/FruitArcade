import { UnlockedAchievements } from '../types';
import { ACHIEVEMENT_DEFINITIONS } from './achievements';
import { Inventory, SHOP_ITEMS, isStaffId, shopItem } from './shop';

// Titles worn next to the nickname: every unlocked achievement becomes one, plus 주간 챔피언,
// titles bought in the shop, and the 운영진 titles (staff_*) that only admins have.
// Ids are stored on leaderboard entries; firestore.rules check their format and keep staff_* to admins.

export const WEEKLY_CHAMPION = 'weekly_champion';

export interface TitleDef {
  id: string;
  label: string;
  icon: string;
  /** 운영진 title, shown with its own badge */
  staff?: boolean;
  /** RGB title: the letters run through the colours */
  rgb?: boolean;
}

const CHAMPION: TitleDef = { id: WEEKLY_CHAMPION, label: '주간 챔피언', icon: '👑' };

export function titleDef(id: string | undefined | null): TitleDef | null {
  if (!id) return null;
  if (id === WEEKLY_CHAMPION) return CHAMPION;
  const item = shopItem(id);
  if (item?.kind === 'title') return { id, label: item.name, icon: item.icon ?? '🏷️', ...(item.staff ? { staff: true } : {}), ...(item.rgb ? { rgb: true } : {}) };
  const a = ACHIEVEMENT_DEFINITIONS.find((x) => x.id === id);
  return a ? { id, label: a.title, icon: a.icon } : null;
}

/** Titles this player can wear: 운영진 first, then 주간 챔피언, bought ones, achievements */
export function earnedTitles(unlocked: UnlockedAchievements, wasChampion: boolean, owned: Inventory): TitleDef[] {
  const shop = SHOP_ITEMS.filter((i) => i.kind === 'title' && owned[i.id]).map((i) => titleDef(i.id)!);
  const achievements = ACHIEVEMENT_DEFINITIONS.filter((a) => unlocked[a.id]).map((a) => ({ id: a.id, label: a.title, icon: a.icon }));
  return [...shop.filter((t) => t.staff), ...(wasChampion ? [CHAMPION] : []), ...shop.filter((t) => !t.staff), ...achievements];
}

/** The worn title, if the player still has it */
export function wornTitle(id: string, unlocked: UnlockedAchievements, wasChampion: boolean, owned: Inventory): TitleDef | null {
  if (!id) return null;
  if (id === WEEKLY_CHAMPION) return wasChampion ? CHAMPION : null;
  if (shopItem(id)?.kind === 'title' || isStaffId(id)) return owned[id] ? titleDef(id) : null;
  return unlocked[id] ? titleDef(id) : null;
}
