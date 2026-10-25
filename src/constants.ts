import { GameSettings, GameType, ScreenType } from './types';

export const APP_VERSION = '3.21.5';

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
  cardBack: '',
  blade: '',
  runner: '',
  suikaSkin: '',
  showPresence: true,
  qaMode: false,
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
    how: ['과일을 떨어뜨려 같은 과일끼리 붙여요', '🔨 망치로 부수고 🫨 흔들기로 섞어요', '넘침 선 위에 5초 넘게 쌓이면 끝!'],
    startHint: '← → 이동 · Space 낙하 · 1 망치 · 2 흔들기',
    tutorial: [
      { emoji: '👆', title: '조준하고 떨어뜨리기', text: '마우스나 손가락으로 위치를 정하고 놓으면 과일이 떨어져요. 키보드는 ← → 와 Space.' },
      { emoji: '🍒➕🍒', title: '같은 과일끼리 합체', text: '같은 과일이 닿으면 한 단계 큰 과일이 돼요. 체리에서 시작해 수박까지!' },
      { emoji: '🔨', title: '아이템', text: '🔨 망치를 누르고 과일을 톡 치면 그 과일이 부서져요. 🫨 흔들기는 병을 흔들어 쌓인 과일을 섞어요. 한 판에 두 개씩 받고, 과일을 10번 합칠 때마다 하나 더! (키보드 1 · 2)' },
      { emoji: '🔥', title: '오래 버틸수록 점수 UP', text: '30초마다 점수 배율이 0.1씩 올라 5분이면 2배! 대신 시간이 갈수록 체리는 줄고 큰 과일이 자주 나와요.' },
      { emoji: '⚠️', title: '넘침 선을 넘기지 마세요', text: '쌓인 과일이 넘침 선 위에 5초 넘게 머물면 게임이 끝나요.' },
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
    how: ['좌우로 움직여 떨어지는 과일을 피해요', '⭐ 황금 별을 먹으면 +50점', '🛡️ 🧲 🐢 ✨ 아이템으로 위기를 넘겨요'],
    startHint: '← → 또는 A D 로 이동 · Space 시작',
    tutorial: [
      { emoji: '↔️', title: '좌우로 피하기', text: '마우스나 손가락을 따라 움직이고, 키보드는 ← → 또는 A D 를 써요.' },
      { emoji: '⭐', title: '황금 별은 먹기', text: '과일에 닿으면 끝! 대신 황금 별을 먹으면 보너스 점수를 받아요.' },
      { emoji: '🛡️', title: '아이템', text: '방패는 과일 한 번을 막고, 자석은 별을 끌어오고, 거북이는 과일을 느리게, 반짝이는 점수를 2배로 만들어요.' },
      { emoji: '🌶️', title: '점점 빨라져요', text: '10초마다 레벨이 올라요. 시작 전에 쉬움 · 보통 · 어려움을 고를 수 있어요.' },
    ],
  },
  puzzle: {
    id: 'puzzle',
    name: '과일 퍼즐',
    short: '퍼즐',
    emoji: '🧩',
    tone: 'grape',
    screen: 'puzzle',
    tag: 'PUZZLE',
    desc: '같은 과일 3개를 한 줄로 맞춰 터뜨리세요. 30번 안에 최고 점수!',
    how: ['옆 과일과 자리를 바꿔 3개를 맞춰요', '4개는 줄 폭탄, 5개는 큰 폭탄이 돼요', '연쇄로 터지면 점수가 껑충!'],
    startHint: '밀거나 두 칸을 차례로 눌러 바꿔요',
    tutorial: [
      { emoji: '👉🍓', title: '자리 바꾸기', text: '과일을 옆으로 밀거나, 두 과일을 차례로 눌러 자리를 바꿔요. 같은 과일 3개가 한 줄이 되면 터져요.' },
      { emoji: '💣', title: '특수 과일', text: '4개를 맞추면 한 줄을 지우는 줄 폭탄, 5개나 ㄱ자로 맞추면 주변을 지우는 큰 폭탄이 생겨요.' },
      { emoji: '🔥', title: '연쇄와 이동 횟수', text: '떨어진 과일이 또 맞춰지면 연쇄 보너스! 이동은 30번이에요. 막히면 💡 힌트를 눌러요.' },
    ],
  },
  slice: {
    id: 'slice',
    name: '과일 자르기',
    short: '자르기',
    emoji: '🔪',
    tone: 'soda',
    screen: 'slice',
    tag: 'NEW',
    desc: '날아오르는 과일을 그어서 싹둑! 폭탄은 조심하세요.',
    how: ['화면을 그어 과일을 잘라요', '한 번에 3개 이상 자르면 콤보!', '💣 폭탄을 자르거나 3번 놓치면 끝'],
    startHint: '마우스를 누른 채 긋거나 손가락으로 밀어요',
    tutorial: [
      { emoji: '👆🍉', title: '그어서 자르기', text: '마우스를 누른 채로 긋거나 손가락으로 화면을 밀어, 날아오르는 과일을 잘라요. 빠르게 그어야 잘려요.' },
      { emoji: '🔥', title: '한 번에 여러 개', text: '한 번 그을 때 3개 이상 자르면 콤보 보너스! ⭐ 황금 별은 +50점, ❄️ 얼음을 자르면 잠깐 느려져요.' },
      { emoji: '💣', title: '폭탄은 피하기', text: '폭탄을 자르면 바로 끝나요. 과일을 자르지 못하고 3개 떨어뜨려도 끝!' },
    ],
  },
};

export const GAME_ORDER: GameType[] = ['memory', 'suika', 'dash', 'puzzle', 'slice'];

export const SCREEN_GAME: Partial<Record<ScreenType, GameType>> = {
  'memory-setup': 'memory',
  'memory-play': 'memory',
  suika: 'suika',
  dash: 'dash',
  puzzle: 'puzzle',
  slice: 'slice',
};

export const PLAY_SCREENS: ScreenType[] = ['memory-play', 'suika', 'dash', 'puzzle', 'slice'];
