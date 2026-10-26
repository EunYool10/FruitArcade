/** Seconds → mm:ss (or mm:ss.t) */
export const formatTime = (sec: number, showTenths = false): string => {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const mins = Math.floor(sec / 60);
  const rest = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (showTenths) {
    const whole = Math.floor(rest);
    return `${pad(mins)}:${pad(whole)}.${Math.floor((rest - whole) * 10)}`;
  }
  return `${pad(mins)}:${pad(Math.floor(rest))}`;
};

export const formatNumber = (n: number): string => Math.round(n).toLocaleString('ko-KR');

/** Total play time: "45분", "3시간 20분" */
export const formatPlayTime = (sec: number): string => {
  const m = Math.floor(Math.max(0, sec) / 60);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;
};

/**
 * Short form for big amounts so coin chips stay one line: 99,999 · 12.3만 · 4,567만 · 999.9억 · ∞.
 * Rounds down, so it never shows more than there is.
 */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const v = Math.max(0, Math.floor(n));
  if (v < 100_000) return v.toLocaleString('ko-KR');
  for (const [unit, name] of [[1e12, '조'], [1e8, '억'], [1e4, '만']] as const) {
    if (v < unit) continue;
    const x = v / unit;
    const shown = x >= 1000 ? Math.floor(x).toLocaleString('ko-KR') : (Math.floor(x * 10) / 10).toLocaleString('ko-KR');
    return shown + name;
  }
  return v.toLocaleString('ko-KR');
}

/** Korean particle that fits the word's last syllable: josa('테두리', '을', '를') → '를' */
export function josa(word: string, afterConsonant: string, afterVowel: string): string {
  const code = word.trim().charCodeAt(word.trim().length - 1) - 0xac00;
  if (!(code >= 0 && code <= 11171)) return `${afterConsonant}(${afterVowel})`;
  return code % 28 ? afterConsonant : afterVowel;
}

export function relativeTime(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return '방금 전';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const date = new Date(at);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** Time left until local midnight, e.g. "3시간 12분" */
export function untilMidnight(now = new Date()): string {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const mins = Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}
