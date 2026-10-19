import { useId, useLayoutEffect, useSyncExternalStore } from 'react';

// Which windows are open, in the order they opened. Only the newest one shows; the others
// stay mounted (keeping their state) but hidden until it closes, so two windows never pile
// up on screen. Full-screen result cards hide too while any window is open.

let stack: string[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Registers an open window; true while it is the one on top */
export function useModalLayer(open: boolean): boolean {
  const id = useId();
  useLayoutEffect(() => {
    if (!open) return;
    stack = [...stack, id];
    emit();
    return () => {
      stack = stack.filter((x) => x !== id);
      emit();
    };
  }, [open, id]);
  // Not registered yet (the first render while opening) counts as on top
  return useSyncExternalStore(
    subscribe,
    () => !stack.includes(id) || stack[stack.length - 1] === id,
    () => true
  );
}

/** True while any window is open */
export const useAnyModalOpen = (): boolean => useSyncExternalStore(subscribe, () => stack.length > 0, () => false);
