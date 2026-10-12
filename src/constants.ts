import { GameSettings, GameType, ScreenType } from './types';

export const APP_VERSION = '3.0.1';

export const DEFAULT_SETTINGS: GameSettings = {
  theme: 'light',
  sfxEnabled: true,
  volume: 70,
  animEnabled: true,
  comboEffect: true,
  shakeEffect: true,
  celebrateEffect: true,
  highContrast: false,
  cardScale: 100,
  haptics: true,
  bgmEnabled: true,
  bgmVolume: 40,
  dashDifficulty: 'normal',
};

export type Tone = 'berry' | 'melon' | 'mango' | 'grape' | 'soda';

// Full class names (not built at runtime) so Tailwind can see them
export const TONE: Record<Tone, { bg: string; soft: string; ink: string; btn: string }> = {
  berry: { bg: 'bg-berry', soft: 'bg-berry-soft', ink: 'text-berry-ink', btn: 'btn-primary' },
  melon: { bg: 'bg-melon', soft: 'bg-melon-soft', ink: 'text-melon-ink', btn: 'btn-melon' },
  mango: { bg: 'bg-mango', soft: 'bg-mango-soft', ink: 'text-mango-ink', btn: 'btn-mango' },
  grape: { bg: 'bg-grape', soft: 'bg-grape-soft', ink: 'text-grape-ink', btn: 'btn-grape' },
  soda: { bg: 'bg-soda', soft: 'bg-soda-soft', ink: 'text-soda-ink', btn: 'btn-soda' },
};

export interface GameMeta {
  id: GameType;
  name: string;
  short: string;
  emoji: string;
  tone: Tone;
  /** Screen opened from the lobby */
  screen: ScreenType;
  tag: string;
  desc: string;
  how: string[];
  startHint: string;
  /** First-visit guide: one card per step */
  tutorial: { emoji: string; title: string; text: string }[];
}

export const GAMES: Record<GameType, GameMeta> = {
  memory: {
    id: 'memory',
    name: '과일 메모리',
    short: '메모리',
    emoji: '🍓',
    tone: 'berry',
    screen: 'memory-setup',
    tag: 'CLASSIC',
    desc: '뒤집힌 카드 속 같은 과일 짝을 모두 찾아내세요.',
    how: ['처음 몇 초 동안 카드를 외워요', '같은 과일 두 장을 연달아 뒤집으면 성공', '연속으로 맞히면 콤보!'],
    startHint: 'H · C 키로 힌트를 쓸 수 있어요',
    tutorial: [
      { emoji: '👀', title: '카드를 외워요', text: '처음 몇 초 동안 모든 카드가 앞면으로 보여요. 위치를 잘 기억해 두세요.' },
      { emoji: '🍓🍓', title: '같은 과일 짝 찾기', text: '카드 두 장을 연달아 뒤집어 같은 과일이면 성공! 틀리면 점수가 조금 깎여요.' },
      { emoji: '🔥', title: '콤보와 힌트', text: '연속으로 맞히면 보너스 점수! 막히면 ⚡ 플래시(H)나 🔍 카드 힌트(C)를 써 보세요.' },
    ],
  },
  suika: {
    id: 'suika',
    name: '수박 게임',
    short: '수박',
    emoji: '🍉',
    tone: 'melon',
    screen: 'suika',
    tag: 'POPULAR',
    desc: '같은 과일끼리 합쳐 더 큰 과일로! 수박까지 키워 보세요.',
    how: ['과일을 떨어뜨려 같은 과일끼리 붙여요', '합칠수록 더 큰 과일로 진화해요', '점선 위로 3초 넘게 쌓이면 끝!'],
    startHint: '← → 이동 · Space 낙하 · Enter 시작',
    tutorial: [
      { emoji: '👆', title: '조준하고 떨어뜨리기', text: '마우스나 손가락으로 위치를 정하고 놓으면 과일이 떨어져요. 키보드는 ← → 와 Space.' },
      { emoji: '🍒➕🍒', title: '같은 과일끼리 합체', text: '같은 과일이 닿으면 한 단계 큰 과일이 돼요. 체리에서 시작해 수박까지!' },
      { emoji: '⚠️', title: '점선을 넘기지 마세요', text: '쌓인 과일이 점선 위에 3초 넘게 머물면 게임이 끝나요.' },
    ],
  },
  dash: {
    id: 'dash',
    name: 'FRUIT DASH',
    short: '대시',
    emoji: '🏃',
    tone: 'mango',
    screen: 'dash',
    tag: 'ACTION',
    desc: '쏟아지는 과일을 피하고 황금 별을 모아 최고 기록에 도전!',
    how: ['좌우로 움직여 떨어지는 과일을 피해요', '⭐ 황금 별을 먹으면 +50점', '시간이 지날수록 빨라져요'],
    startHint: '← → 또는 A D 로 이동 · Space 시작',
    tutorial: [
      { emoji: '↔️', title: '좌우로 피하기', text: '마우스나 손가락을 따라 움직이고, 키보드는 ← → 또는 A D 를 써요.' },
      { emoji: '⭐', title: '황금 별은 먹기', text: '과일에 닿으면 끝! 대신 황금 별을 먹으면 보너스 점수를 받아요.' },
      { emoji: '🌶️', title: '점점 빨라져요', text: '10초마다 레벨이 올라요. 시작 전에 쉬움 · 보통 · 어려움을 고를 수 있어요.' },
    ],
  },
};

export const GAME_ORDER: GameType[] = ['memory', 'suika', 'dash'];

export const SCREEN_GAME: Partial<Record<ScreenType, GameType>> = {
  'memory-setup': 'memory',
  'memory-play': 'memory',
  suika: 'suika',
  dash: 'dash',
};

export const PLAY_SCREENS: ScreenType[] = ['memory-play', 'suika', 'dash'];
