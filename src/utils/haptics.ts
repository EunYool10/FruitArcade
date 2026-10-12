// Short vibrations on phones that support it (ignored elsewhere)

export const HAPTICS_SUPPORTED = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const HAPTIC = {
  tap: 8,
  match: 12,
  merge: 15,
  wrong: [30, 40, 30],
  crash: [60, 40, 90],
  over: [80, 60, 120],
} as const;

export function vibrate(pattern: number | readonly number[], settings: { haptics: boolean }): void {
  if (!settings.haptics || !HAPTICS_SUPPORTED) return;
  try {
    navigator.vibrate(pattern as number | number[]);
  } catch {
    // ignore
  }
}
