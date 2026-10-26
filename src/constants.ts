import { GameSettings, GameType, ScreenType } from './types';

export const APP_VERSION = '3.36.0';

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
  sliceDifficulty: 'normal',
  cardBack: '',
  blade: '',
  runner: '',
  suikaSkin: '',
  showPresence: true,
  qaMode: false,
};

export type Tone = 'berry' | 'melon' | 'mango' | 'grape' | 'soda' | 'peach';

// Full class names (not built at runtime) so Tailwind can see them
export const TONE: Record<Tone, { bg: string; soft: string; ink: string; btn: string }> = {
  berry: { bg: 'bg-berry', soft: 'bg-berry-soft', ink: 'text-berry-ink', btn: 'btn-primary' },
  melon: { bg: 'bg-melon', soft: 'bg-melon-soft', ink: 'text-melon-ink', btn: 'btn-melon' },
  mango: { bg: 'bg-mango', soft: 'bg-mango-soft', ink: 'text-mango-ink', btn: 'btn-mango' },
  grape: { bg: 'bg-grape', soft: 'bg-grape-soft', ink: 'text-grape-ink', btn: 'btn-grape' },
  soda: { bg: 'bg-soda', soft: 'bg-soda-soft', ink: 'text-soda-ink', btn: 'btn-soda' },
  peach: { bg: 'bg-peach', soft: 'bg-peach-soft', ink: 'text-peach-ink', btn: 'btn-peach' },
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
  /** Lobby filter: quick hands, thinking, or playing together on one device */
  kind: 'reflex' | 'brain' | 'party';
  /** What a score counts ("점" unless set) */
  unit?: string;
  /** false: no leaderboard, challenge links or player-card best (party games) */
  ranked?: false;
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
    kind: 'brain',
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
    kind: 'brain',
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
    kind: 'reflex',
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
    kind: 'brain',
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
    kind: 'reflex',
    tag: 'SWIPE',
    desc: '날아오르는 과일을 그어서 싹둑! 폭탄은 조심하세요.',
    how: ['화면을 그어 과일을 잘라요', '한 번에 3개 이상 자르면 콤보! ❤️ 하트는 회복', '💣 폭탄 · 놓친 과일이 쌓이면 끝 (난이도마다 달라요)'],
    startHint: '마우스를 누른 채 긋거나 손가락으로 밀어요',
    tutorial: [
      { emoji: '👆🍉', title: '그어서 자르기', text: '마우스를 누른 채로 긋거나 손가락으로 화면을 밀어, 날아오르는 과일을 잘라요. 빠르게 그어야 잘려요.' },
      { emoji: '🔥', title: '한 번에 여러 개', text: '한 번 그을 때 3개 이상 자르면 콤보 보너스! ⭐ 황금 별은 +50점, ❄️ 얼음을 자르면 잠깐 느려져요.' },
      { emoji: '💣', title: '폭탄은 피하기', text: '폭탄을 자르거나 과일을 떨어뜨리면 위험해요. 중간 난이도는 폭탄 2번, 놓친 과일 3개면 끝!' },
      { emoji: '❤️', title: '하트로 회복', text: '하트를 자르면 목숨이 하나 돌아와요. 목숨이 가득하면 맞은 폭탄 하나를 지워 줘요.' },
      {
        emoji: '🌶️',
        title: '난이도 고르기',
        text: '쉬움은 목숨 5개 · 폭탄 3번, 중간은 3개 · 2번, 어려움은 2개 · 1번이면 끝나요. 어려울수록 빠르고 폭탄이 많지만 점수를 더 받아요.',
      },
    ],
  },
  piano: {
    id: 'piano',
    name: '과일 피아노',
    short: '피아노',
    emoji: '🎹',
    tone: 'peach',
    screen: 'piano',
    kind: 'reflex',
    tag: 'MUSIC',
    desc: '내려오는 과일 타일을 눌러 노래를 연주해요. 하나라도 놓치면 끝!',
    how: ['곡을 고르고 맨 아래 과일 타일부터 눌러요', '누를 때마다 노래가 한 음씩 연주돼요', '빈 칸을 누르거나 타일을 놓치면 끝!'],
    startHint: '터치하거나 키보드 D F J K 로 눌러요',
    tutorial: [
      { emoji: '🎵', title: '곡 고르기', text: '반짝반짝 작은 별부터 엘리제를 위하여까지, 연주하고 싶은 곡을 골라요.' },
      { emoji: '👆🍓', title: '아래부터 차례로', text: '내려오는 과일 타일을 맨 아래 것부터 눌러요. 누를 때마다 노래가 한 음씩 연주되고 1점씩 올라요. 키보드는 D F J K.' },
      { emoji: '🔁', title: '완주하면 더 빠르게', text: '한 곡을 끝까지 치면 조금 더 빨라져서 처음부터 다시! 빈 칸을 누르거나 타일을 놓치면 끝나요.' },
    ],
  },
  jump: {
    id: 'jump',
    name: '과일 점프',
    short: '점프',
    emoji: '🦘',
    tone: 'melon',
    screen: 'jump',
    kind: 'reflex',
    tag: 'RUN',
    desc: '달리는 과일을 폴짝! 선인장과 벌을 넘으며 멀리멀리 달려요.',
    how: ['탭하거나 스페이스로 점프해요', '길게 누르면 더 높이 뛰어요', '🌵 장애물에 부딪히면 끝! 🍒 체리는 보너스'],
    startHint: 'Space · ↑ 점프 · ↓ 빨리 내려오기',
    tutorial: [
      { emoji: '👆🍊', title: '탭해서 점프', text: '화면을 탭하거나 스페이스 · ↑ 키를 누르면 과일이 폴짝 뛰어요. 길게 누르고 있으면 더 높이 뛰어요.' },
      { emoji: '🌵', title: '장애물 넘기', text: '선인장 · 돌 · 버섯에 부딪히면 끝나요. 갈수록 빨라지니 타이밍을 잘 맞춰요. 공중에서 ↓ 키를 누르면 빨리 내려와요.' },
      { emoji: '🐝', title: '벌 조심', text: '낮게 나는 벌은 뛰어넘고, 높이 나는 벌은 그냥 달리면 머리 위로 지나가요. 괜히 뛰면 부딪혀요!' },
      { emoji: '🍒', title: '체리 모으기', text: '체리를 먹으면 +20점! 멀리 달릴수록 점수가 오르고, 날이 저물면 밤이 와요.' },
    ],
  },
  juice: {
    id: 'juice',
    name: '과일 주스 가게',
    short: '주스',
    emoji: '🧃',
    tone: 'mango',
    screen: 'juice',
    kind: 'reflex',
    tag: 'NEW',
    desc: '손님이 주문한 과일로 주스를 만들어 줘요. 늦으면 손님이 화나요!',
    how: ['주문한 과일을 눌러 믹서에 넣어요', '초록으로 빛나는 손님을 눌러 주스를 줘요', '손님이 3번 화나서 가 버리면 가게 마감!'],
    startHint: '숫자 1–8 과일 · Enter 주기 · ⌫ 비우기',
    tutorial: [
      { emoji: '🐻🍓', title: '주문 보기', text: '손님 말풍선에 먹고 싶은 과일이 나와요. 같은 과일이 두 번 나오면 두 번 넣어야 해요.' },
      { emoji: '🥤', title: '믹서에 넣기', text: '아래 과일을 눌러 믹서에 넣어요. 순서는 상관없어요. 잘못 넣었으면 비우기!' },
      { emoji: '😋', title: '손님에게 주기', text: '믹서 속 과일이 주문과 맞으면 손님이 초록으로 빛나요. 손님을 누르면 주스를 줘요. 빨리 줄수록, 연속으로 성공할수록 점수가 커져요.' },
      { emoji: '😠', title: '늦으면 안 돼요', text: '손님 아래 막대가 다 줄면 화나서 가 버려요. 3번이면 가게 마감! 레벨이 오르면 과일과 손님이 늘어나요.' },
    ],
  },
  draw: {
    id: 'draw',
    name: '과일 그리기',
    short: '그리기',
    emoji: '🎨',
    tone: 'grape',
    screen: 'draw',
    kind: 'party',
    unit: '%',
    ranked: false,
    tag: 'PARTY',
    desc: '제시어 과일을 그리고, 누가 더 닮게 그렸는지 싱크율로 겨뤄요.',
    how: ['함께 할 사람 수 · 시간 · 라운드를 정해요', '차례대로 제시어 과일을 그려요', '싱크율 1등이 라운드 점수를 가져가요'],
    startHint: '한 화면을 돌려 가며 함께 해요 · 혼자서도 OK',
    tutorial: [
      { emoji: '👥', title: '사람 수 정하기', text: '1명부터 6명까지. 한 휴대폰(또는 컴퓨터)을 돌려 가며 차례로 그려요. 그리기 시간과 라운드 수도 골라요.' },
      { emoji: '🍓', title: '제시어 그리기', text: '라운드마다 과일 하나가 나와요. 시간 안에 펜 · 채우기 · 지우개로 그 과일을 그려요. 다른 사람이 그릴 땐 보지 않기!' },
      { emoji: '🔍', title: '싱크율', text: '그림이 진짜 과일 그림과 모양 · 색 · 위치가 얼마나 닮았는지 0~100%로 재요. 색칠까지 하면 더 높아져요.' },
      { emoji: '👑', title: '라운드 우승', text: '싱크율이 가장 높은 사람이 그 라운드의 1점을 가져가요. 점수가 가장 많은 사람이 최종 우승!' },
    ],
  },
};

export const GAME_ORDER: GameType[] = ['memory', 'suika', 'dash', 'puzzle', 'slice', 'piano', 'jump', 'juice', 'draw'];

/** Games with leaderboards, challenge links and a best on the player card */
export const RANKED_GAMES: GameType[] = GAME_ORDER.filter((g) => GAMES[g].ranked !== false);

export const SCREEN_GAME: Partial<Record<ScreenType, GameType>> = {
  'memory-setup': 'memory',
  'memory-play': 'memory',
  suika: 'suika',
  dash: 'dash',
  puzzle: 'puzzle',
  slice: 'slice',
  piano: 'piano',
  jump: 'jump',
  juice: 'juice',
  draw: 'draw',
};

export const PLAY_SCREENS: ScreenType[] = ['memory-play', 'suika', 'dash', 'puzzle', 'slice', 'piano', 'jump', 'juice', 'draw'];
