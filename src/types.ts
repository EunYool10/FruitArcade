export type ScreenType = 'intro' | 'game-select' | 'memory-setup' | 'memory-play' | 'suika' | 'stock' | 'dash';

export type MemoryMode = '4' | '6' | '8' | '8-joker';
export type LifeLimit = 'infinite' | '10' | '5';

export interface GameSettings {
  sfxEnabled: boolean;
  volume: number; // 0 - 100
  animEnabled: boolean;
  comboEffect: boolean;
  particleEffect: boolean;
  shakeEffect: boolean;
  celebrateEffect: boolean;
  highContrast: boolean;
  cardScale: number; // 80 - 120
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  game?: 'all' | 'memory' | 'suika' | 'stock' | 'dash';
}

export interface UnlockedAchievements {
  [id: string]: string; // id -> formatted date
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserStatistics {
  totalPlayCount: number;
  totalPlayTime: number; // seconds
  memoryPlayCount: number;
  suikaPlayCount: number;
  stockPlayCount: number;
  dashPlayCount: number;
  memoryHighScore: number;
  suikaHighScore: number;
  stockHighScore: number;
  dashHighScore: number;
  lastPlayedAt: string;
}

export interface UserGameData {
  profile: UserProfile;
  statistics: UserStatistics;
  achievements: UnlockedAchievements;
  settings: GameSettings;
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

// Stock Game Types
export interface StockItem {
  ticker: string;
  name: string;
  price: number;
  prev: number;
  chg: number;
  pct: number;
  hist: number[];
}

export interface NewsItem {
  h: string;
  s: string;
  tag: 'positive' | 'negative' | 'neutral';
  hint: string;
  t: string[];
  e: [number, number];
}

export interface PortfolioPosition {
  qty: number;
  avg: number;
}

export interface TradeHistoryItem {
  type: 'buy' | 'sell';
  ticker: string;
  qty: number;
  price: number;
  total: number;
}

