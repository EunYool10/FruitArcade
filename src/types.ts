export type ScreenType = 'lobby' | 'memory-setup' | 'memory-play' | 'suika' | 'dash' | 'puzzle';

export type GameType = 'memory' | 'suika' | 'dash' | 'puzzle';

export type ThemeMode = 'light' | 'dark' | 'system';

export type DashDifficulty = 'easy' | 'normal' | 'hard';

export type MemoryMode = '4' | '6' | '8' | '8-joker';
export type LifeLimit = 'infinite' | '10' | '5';

export interface MemoryConfig {
  mode: MemoryMode;
  previewTime: number; // ms
  lifeLimit: LifeLimit;
}

export interface GameSettings {
  theme: ThemeMode;
  sfxEnabled: boolean;
  volume: number; // 0 - 100
  animEnabled: boolean;
  comboEffect: boolean;
  shakeEffect: boolean;
  celebrateEffect: boolean;
  highContrast: boolean;
  cardScale: number; // 80 - 120
  haptics: boolean;
  bgmEnabled: boolean;
  bgmVolume: number; // 0 - 100
  dashDifficulty: DashDifficulty;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  game?: 'all' | GameType;
}

export interface UnlockedAchievements {
  [id: string]: string; // id -> formatted date
}

export interface UserStatistics {
  totalPlayCount: number;
  totalPlayTime: number; // seconds
  memoryPlayCount: number;
  suikaPlayCount: number;
  dashPlayCount: number;
  puzzlePlayCount: number;
  memoryHighScore: number;
  suikaHighScore: number;
  dashHighScore: number;
  puzzleHighScore: number;
  missionStamps: number; // days on which every daily mission was cleared
  bestStreak: number; // longest run of consecutive play days
  lastPlayedAt: string;
}

/** What a game reports once a round ends. */
export interface GameResult {
  game: GameType;
  score: number;
  seconds: number;
  won?: boolean;
}

/** What the app hands back so the result screen can celebrate. */
export interface GameReward {
  xpGained: number;
  newBest: boolean;
  prevBest: number;
  levelUp: number | null;
  missions: string[];
  /** Consecutive play days, set when this round extended the streak */
  streak: number | null;
  /** Achievements unlocked during this round, e.g. "🔥 콤보 폭발 폭주족" */
  achievements: string[];
  stamp: boolean;
}

export interface HistoryEntry extends GameResult {
  at: number; // epoch ms
  best?: boolean;
}

export interface MemoryCard {
  id: string;
  value: string;
  index: number;
  isFlipped: boolean;
  isMatched: boolean;
  isJokerRevealed?: boolean;
  isSpecial?: 'card-hint' | 'flash';
  specialUsed?: boolean;
  colorClass?: string;
  isFlashing?: boolean;
}

// Suika Types
export interface SuikaFruitDef {
  name: string;
  emoji: string;
  r: number;
  score: number;
  color: string;
}

export interface SuikaBody {
  id: string;
  lv: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  mass: number;
  angle: number;
  aVel: number;
  scale: number;
  sleeping: boolean;
  sleepT: number;
  /** Has touched the floor or the pile (falling fruit never count as overflowing) */
  landed?: boolean;
}

export interface SuikaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface SuikaFloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vx: number;
  vy: number;
}

// Fruit Dash Types
export interface DashFallingFruit {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  emoji: string;
  color: string;
  isHazard: boolean;
  isBonus?: boolean;
  bonusPoints?: number;
  rot: number;
  rotSpeed: number;
}

export interface DashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}
