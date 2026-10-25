// Nickname and fruit avatar, available without signing in

const PROFILE_KEY = 'fruit_arcade_profile';

export interface PlayerProfile {
  /** Empty = use the Google name, or "게스트" */
  nickname: string;
  /** Empty = Google photo when signed in, otherwise the level fruit */
  avatar: string;
  /** Title worn next to the name (achievement id or "weekly_champion"), empty = none */
  title: string;
  /** Avatar frame from the shop (item id), empty = none */
  frame: string;
}

// When an admin last changed this player's look (profile.modAt in the cloud). A newer one makes
// this device take the cloud look as it is, even fields put back to empty.
const MOD_KEY = 'fruit_arcade_profile_mod';

export function loadProfileMod(): string {
  try {
    return localStorage.getItem(MOD_KEY) || '';
  } catch {
    return '';
  }
}

export function saveProfileMod(at: string): void {
  try {
    if (at) localStorage.setItem(MOD_KEY, at);
    else localStorage.removeItem(MOD_KEY);
  } catch {
    // ignore
  }
}

export const AVATARS = ['🍓', '🍉', '🍊', '🍋', '🍇', '🍑', '🍒', '🍍', '🥝', '🍎', '🫐', '🥥'];
export const NICKNAME_MAX = 12;

export function loadProfile(): PlayerProfile {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    const text = (v: unknown) => (typeof v === 'string' ? v : '');
    return { nickname: text(p?.nickname), avatar: text(p?.avatar), title: text(p?.title), frame: text(p?.frame) };
  } catch {
    return { nickname: '', avatar: '', title: '', frame: '' };
  }
}

export function saveProfile(p: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export const cleanNickname = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX);

// Names that would pass as staff: "Tester", "QA", "관리자", "운영자" ...
// firestore.rules (isReservedName) checks the same list for leaderboard names.
const RESERVED_ANYWHERE = /(tester|admin|moderator|developer|official|operator|gamemaster|staff|관리자|운영자|운영진|운영팀|개발자|개발팀|테스터|테스트|공식계정|스태프|큐에이|지엠)/;
const RESERVED_WORD = /(^|[^a-z])(qa|gm|dev|mod|test)([^a-z]|$)/;

export function isReservedNickname(name: string): boolean {
  const lowered = name.toLowerCase();
  return RESERVED_ANYWHERE.test(lowered.replace(/[^a-z가-힣]/g, '')) || RESERVED_WORD.test(lowered);
}
