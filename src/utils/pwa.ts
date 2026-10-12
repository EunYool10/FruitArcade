// Install prompt + service worker updates, exposed to React as a tiny store
import { useSyncExternalStore } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** The browser offered "install app" (Chrome, Edge, Samsung Internet …) */
  canInstall: boolean;
  /** Already running as an installed app */
  installed: boolean;
  /** iPhone/iPad: install manually via Share → Add to Home Screen */
  ios: boolean;
  /** A new version finished downloading */
  updateReady: boolean;
}

let deferred: InstallPromptEvent | null = null;
let waiting: ServiceWorker | null = null;
const listeners = new Set<() => void>();

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

let state: PwaState = {
  canInstall: false,
  installed: isStandalone(),
  ios: typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent),
  updateReady: false,
};

function emit() {
  state = { ...state, canInstall: !!deferred && !isStandalone(), installed: isStandalone(), updateReady: !!waiting };
  listeners.forEach((l) => l());
}

export function initPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });

  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  navigator.serviceWorker
    .register('./sw.js')
    .then((reg) => {
      const watch = (w: ServiceWorker) =>
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) {
            waiting = w;
            emit();
          }
        });
      if (reg.waiting && navigator.serviceWorker.controller) {
        waiting = reg.waiting;
        emit();
      }
      reg.addEventListener('updatefound', () => reg.installing && watch(reg.installing));
      // Look for a new version whenever the app comes back to the foreground
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg.update().catch(() => {}));
    })
    .catch(() => {});

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !waiting) return;
    reloading = true;
    window.location.reload();
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  emit();
  return outcome === 'accepted';
}

export function applyUpdate(): void {
  waiting?.postMessage('SKIP_WAITING');
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
}
