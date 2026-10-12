// Nickname and fruit avatar, available without signing in

const PROFILE_KEY = 'fruit_arcade_profile';

export interface PlayerProfile {
  /** Empty = use the Google name, or "게스트" */
  nickname: string;
  /** Empty = Google photo when signed in, otherwise the level fruit */
  avatar: string;
}

export const AVATARS = ['🍓', '🍉', '🍊', '🍋', '🍇', '🍑', '🍒', '🍍', '🥝', '🍎', '🫐', '🥥'];
export const NICKNAME_MAX = 12;

export function loadProfile(): PlayerProfile {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    return { nickname: typeof p?.nickname === 'string' ? p.nickname : '', avatar: typeof p?.avatar === 'string' ? p.avatar : '' };
  } catch {
    return { nickname: '', avatar: '' };
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
