// Online / last seen, worked out from presence/{uid}.at (written by friendsService). Kept apart
// from the Firestore code so screens can use it without loading Firebase.
import { relativeTime } from './format';

/** Seen this recently (ms) counts as online */
export const ONLINE_MS = 150_000;
/** How often the app says "still here" while it is in front */
export const PRESENCE_EVERY_MS = 60_000;

export const isOnline = (at: number | null | undefined, now = Date.now()): boolean => !!at && now - at < ONLINE_MS;

/** "온라인", "3시간 전 접속", or "접속 기록 없음" (never came, or they hide it) */
export function presenceText(at: number | null | undefined, now = Date.now()): string {
  if (!at) return '접속 기록 없음';
  return isOnline(at, now) ? '온라인' : `${relativeTime(at, now)} 접속`;
}
