// Streak reminders on this device: the switch, and whether the browser can do it at all.
// The subscription work (Firestore, push) lives in reminders.ts, loaded only when needed.

const KEY = 'fruit_arcade_reminders';

export interface ReminderState {
  on: boolean;
  /** Random id of this device's subscription doc (push/<uid>~<device>) */
  device: string;
  /** Signature of what was stored last, so an unchanged day isn't written again */
  sent: string;
}

const newDevice = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');

export function loadReminderState(): ReminderState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && typeof s.device === 'string' && /^[a-z0-9]{12}$/.test(s.device)) return { on: !!s.on, device: s.device, sent: String(s.sent || '') };
  } catch {
    // ignore
  }
  return { on: false, device: newDevice(), sent: '' };
}

export function saveReminderState(s: ReminderState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/**
 * ok: notifications work here. install: an iPhone/iPad browser tab, where web push only
 * works from the app added to the home screen. unsupported: no web push in this browser.
 */
export type ReminderSupport = 'ok' | 'install' | 'unsupported';

export function reminderSupport(): ReminderSupport {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return ios ? 'install' : 'unsupported';
  return 'ok';
}

/** The browser said no to notifications for this site (only the browser settings can undo it) */
export const notificationsBlocked = () => 'Notification' in window && Notification.permission === 'denied';
