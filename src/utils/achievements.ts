import { Achievement, UnlockedAchievements } from '../types';

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  { id: 'first_clear', title: '상큼한 첫걸음', desc: '메모리 게임 난이도 상관없이 첫 세트 클리어', icon: '🌱', game: 'memory' },
  { id: 'high_score', title: '메모리 마스터', desc: '메모리 게임에서 최종 점수 150점 이상 기록', icon: '👑', game: 'memory' },
  { id: 'combo_king', title: '콤보 폭발 폭주족', desc: '메모리 게임 연속 콤보 5회 이상 달성', icon: '🔥', game: 'memory' },
  { id: 'hardcore_clear', title: '강철의 심장', desc: '5번 기회(하드코어) 조건에서 클리어', icon: '🛡️', game: 'memory' },
  { id: 'joker_fever', title: '조커 마술사', desc: '스페셜 조커 모드 완전 클리어', icon: '🃏', game: 'memory' },
  { id: 'time_attack_master', title: '빛보다 빠른 손', desc: '8x8 타임어택 모드 클리어', icon: '⚡', game: 'memory' },
  { id: 'perfect_100', title: 'Perfect 100', desc: '오답 감점 없이 깔끔하게 100점 돌파', icon: '💯', game: 'memory' },
  { id: 'no_hint_clear', title: '미니멀리스트', desc: '수동 힌트를 한 번도 쓰지 않고 클리어', icon: '🚫', game: 'memory' },
  { id: 'speed_racer', title: '스피드 레이서', desc: '게임 클리어 타임 20초 이하 기록 (4x4/6x6)', icon: '⏱️', game: 'memory' },
  { id: 'minus_score', title: '마이너스의 손', desc: '오답 연발로 최종 점수가 0점 미만 도달', icon: '📉', game: 'memory' },
  { id: 'joker_streak', title: '조커 대폭발', desc: '조커 모드에서 연속으로 조커를 3번 오픈', icon: '🎆', game: 'memory' },
  { id: 'fail_is_mother', title: '실패는 성공의 어머니', desc: '라이프 제한 모드에서 게임 오버 1회 경험', icon: '☠️', game: 'memory' },
  { id: 'lucky_seven', title: '행운의 세븐', desc: '정확히 최고 콤보 7회 달성', icon: '🍀', game: 'memory' },
  { id: 'veteran_tester', title: '진성 테스터', desc: '크레딧(Credit) 창을 통산 3번 이상 열어 정독', icon: '🔎', game: 'all' },
  { id: 'score_rich', title: '자산가 스코어', desc: '최종 점수 250점 이상 초고득점 달성', icon: '💵', game: 'memory' },
  { id: 'speedy_fail', title: '초고속 광탈', desc: '하드코어 모드에서 15초 안에 광속 게임오버', icon: '💥', game: 'memory' },
  
  // Fruit Dash New Achievements
  { id: 'dash_survivor_30', title: '질주의 생존자', desc: 'FRUIT DASH에서 30초 이상 생존 달성', icon: '🏃', game: 'dash' },
  { id: 'dash_survivor_60', title: '빛의 회피 장인', desc: 'FRUIT DASH에서 60초 이상 생존 달성', icon: '🌪️', game: 'dash' },
  { id: 'dash_dodge_master', title: '회피의 신', desc: 'FRUIT DASH에서 500점 이상 득점 돌파', icon: '🎯', game: 'dash' },
  { id: 'dash_star_collector', title: '별빛 과일 채집가', desc: 'FRUIT DASH에서 황금 보너스 스타 5회 획득', icon: '⭐', game: 'dash' },

  // Suika Achievements
  { id: 'suika_watermelon', title: '전설의 수박 탄생', desc: '수박 게임에서 거대 수박(🍉) 합성 성공', icon: '🍉', game: 'suika' },
  { id: 'suika_10000', title: '수박 부자', desc: '수박 게임에서 10,000점 이상 기록', icon: '🤑', game: 'suika' },
  { id: 'dash_hard_30', title: '매운맛 생존자', desc: 'FRUIT DASH 어려움 난이도에서 30초 이상 생존', icon: '🌶️', game: 'dash' },

  // Progress
  { id: 'level_5', title: '어엿한 딸기', desc: '레벨 5 달성', icon: '🍓', game: 'all' },
  { id: 'level_10', title: '과일 장인', desc: '레벨 10 달성', icon: '🍑', game: 'all' },
  { id: 'stamp_1', title: '첫 도장', desc: '오늘의 미션 3개를 모두 깨고 도장 받기', icon: '🏅', game: 'all' },
  { id: 'stamp_10', title: '도장 수집가', desc: '미션 도장 10개 모으기', icon: '📮', game: 'all' },
  { id: 'streak_3', title: '사흘 연속', desc: '3일 연속으로 플레이', icon: '🔥', game: 'all' },
  { id: 'streak_7', title: '일주일 개근', desc: '7일 연속으로 플레이', icon: '📅', game: 'all' },
  { id: 'streak_30', title: '한 달 개근', desc: '30일 연속으로 플레이', icon: '🗓️', game: 'all' },

  { id: 'all_achieved', title: '진정한 과일 마스터', desc: '모든 업적을 전부 해금 완료', icon: '🎖️', game: 'all' },
];

export const ACHIEVEMENT_COUNT = ACHIEVEMENT_DEFINITIONS.length;

const ACHIEVEMENTS_KEY = 'fruit_game_achievements';
let cache: UnlockedAchievements | null = null;

function persist(achievements: UnlockedAchievements): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  } catch {
    // ignore
  }
}

export function getUnlockedAchievements(): UnlockedAchievements {
  if (cache) return cache;
  try {
    const data = localStorage.getItem(ACHIEVEMENTS_KEY);
    cache = data ? JSON.parse(data) : {};
  } catch {
    cache = {};
  }
  return cache!;
}

/** Number of unlocked achievements that still exist in the current definitions. */
export function countUnlocked(unlocked: UnlockedAchievements = getUnlockedAchievements()): number {
  return ACHIEVEMENT_DEFINITIONS.filter((a) => unlocked[a.id]).length;
}

/**
 * Merge cloud achievements into the local ones (union, earliest date wins).
 * Returns the merged map and whether the cloud copy is missing anything.
 */
export function mergeAchievements(cloud: UnlockedAchievements): {
  merged: UnlockedAchievements;
  cloudOutdated: boolean;
} {
  const local = getUnlockedAchievements();
  const merged: UnlockedAchievements = { ...cloud };
  let cloudOutdated = false;
  for (const [id, date] of Object.entries(local)) {
    if (!merged[id] || date < merged[id]) {
      merged[id] = date;
      cloudOutdated = true;
    }
  }
  cache = merged;
  persist(merged);
  return { merged, cloudOutdated };
}

export function unlockAchievement(
  id: string,
  onUnlocked?: (ach: Achievement) => void
): boolean {
  const current = getUnlockedAchievements();
  if (current[id]) return false;

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  current[id] = dateStr;
  persist(current);

  const def = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === id);
  if (def && onUnlocked) {
    onUnlocked(def);
  }

  // Check if all other achievements are unlocked
  if (id !== 'all_achieved') {
    const regularAchievements = ACHIEVEMENT_DEFINITIONS.filter((a) => a.id !== 'all_achieved');
    const allDone = regularAchievements.every((a) => current[a.id]);
    if (allDone && !current['all_achieved']) {
      unlockAchievement('all_achieved', onUnlocked);
    }
  }

  return true;
}

export function resetAchievements(): void {
  cache = {};
  try {
    localStorage.removeItem(ACHIEVEMENTS_KEY);
  } catch {
    // ignore
  }
}

