import { GameResult } from '../types';

// Coins and the cosmetics shop. Items only change looks, so the client keeps the books;
// the inventory is merged across devices (union) like achievements.
// Ids starting with "staff_" are the 운영진 series: every admin has all of them (and unlimited
// coins), nobody else can get them, and firestore.rules keep staff titles and frames off
// everyone else's leaderboard entries.

export type ItemKind = 'frame' | 'avatar' | 'title' | 'cardBack' | 'blade' | 'runner';

export interface ShopItem {
  id: string;
  kind: ItemKind;
  name: string;
  price: number;
  /** The emoji of an avatar, or a title's icon */
  icon?: string;
  /** 운영진 전용 */
  staff?: boolean;
}

export const STAFF_PREFIX = 'staff_';
export const isStaffId = (id: string | null | undefined) => !!id && id.startsWith(STAFF_PREFIX);

const staff = (item: Omit<ShopItem, 'price' | 'staff'>): ShopItem => ({ ...item, price: 0, staff: true });

export const SHOP_ITEMS: ShopItem[] = [
  // Avatar frames
  { id: 'frame_berry', kind: 'frame', name: '딸기 테두리', price: 100 },
  { id: 'frame_melon', kind: 'frame', name: '멜론 테두리', price: 100 },
  { id: 'frame_soda', kind: 'frame', name: '소다 테두리', price: 100 },
  { id: 'frame_mango', kind: 'frame', name: '망고 테두리', price: 100 },
  { id: 'frame_grape', kind: 'frame', name: '포도 테두리', price: 150 },
  { id: 'frame_peach', kind: 'frame', name: '복숭아 테두리', price: 200 },
  { id: 'frame_mint', kind: 'frame', name: '민트초코 테두리', price: 250 },
  { id: 'frame_ocean', kind: 'frame', name: '바다 테두리', price: 250 },
  { id: 'frame_sunset', kind: 'frame', name: '노을 테두리', price: 300 },
  { id: 'frame_night', kind: 'frame', name: '밤하늘 테두리', price: 300 },
  { id: 'frame_candy', kind: 'frame', name: '사탕 줄무늬', price: 350 },
  { id: 'frame_gold', kind: 'frame', name: '황금 테두리', price: 400 },
  { id: 'frame_neon', kind: 'frame', name: '네온 테두리', price: 450 },
  { id: 'frame_fire', kind: 'frame', name: '불꽃 테두리', price: 500 },
  { id: 'frame_rainbow', kind: 'frame', name: '무지개 테두리', price: 600 },
  { id: 'frame_diamond', kind: 'frame', name: '다이아몬드 테두리', price: 900 },

  // Avatars beyond the free fruit
  { id: 'av_chick', kind: 'avatar', name: '병아리', icon: '🐥', price: 100 },
  { id: 'av_cat', kind: 'avatar', name: '고양이', icon: '🐱', price: 100 },
  { id: 'av_dog', kind: 'avatar', name: '강아지', icon: '🐶', price: 100 },
  { id: 'av_rabbit', kind: 'avatar', name: '토끼', icon: '🐰', price: 100 },
  { id: 'av_bear', kind: 'avatar', name: '곰돌이', icon: '🐻', price: 120 },
  { id: 'av_frog', kind: 'avatar', name: '개구리', icon: '🐸', price: 120 },
  { id: 'av_donut', kind: 'avatar', name: '도넛', icon: '🍩', price: 120 },
  { id: 'av_icecream', kind: 'avatar', name: '아이스크림', icon: '🍦', price: 120 },
  { id: 'av_panda', kind: 'avatar', name: '판다', icon: '🐼', price: 150 },
  { id: 'av_fox', kind: 'avatar', name: '여우', icon: '🦊', price: 150 },
  { id: 'av_penguin', kind: 'avatar', name: '펭귄', icon: '🐧', price: 150 },
  { id: 'av_cupcake', kind: 'avatar', name: '컵케이크', icon: '🧁', price: 150 },
  { id: 'av_pizza', kind: 'avatar', name: '피자', icon: '🍕', price: 150 },
  { id: 'av_burger', kind: 'avatar', name: '햄버거', icon: '🍔', price: 150 },
  { id: 'av_octopus', kind: 'avatar', name: '문어', icon: '🐙', price: 180 },
  { id: 'av_tiger', kind: 'avatar', name: '호랑이', icon: '🐯', price: 200 },
  { id: 'av_ghost', kind: 'avatar', name: '유령', icon: '👻', price: 200 },
  { id: 'av_rocket', kind: 'avatar', name: '로켓', icon: '🚀', price: 250 },
  { id: 'av_alien', kind: 'avatar', name: '외계인', icon: '👾', price: 250 },
  { id: 'av_robot', kind: 'avatar', name: '로봇', icon: '🤖', price: 250 },
  { id: 'av_star', kind: 'avatar', name: '반짝별', icon: '🌟', price: 300 },
  { id: 'av_fire', kind: 'avatar', name: '불꽃', icon: '🔥', price: 300 },
  { id: 'av_dino', kind: 'avatar', name: '공룡', icon: '🦖', price: 350 },
  { id: 'av_unicorn', kind: 'avatar', name: '유니콘', icon: '🦄', price: 400 },

  // Titles to wear next to the name (achievements give more)
  { id: 'title_juicy', kind: 'title', name: '과즙 팡팡', icon: '🧃', price: 150 },
  { id: 'title_cute', kind: 'title', name: '귀염둥이', icon: '🐣', price: 150 },
  { id: 'title_chill', kind: 'title', name: '여유만만', icon: '😎', price: 150 },
  { id: 'title_sweet', kind: 'title', name: '달콤한 손끝', icon: '🍯', price: 200 },
  { id: 'title_melonlover', kind: 'title', name: '수박 덕후', icon: '🍉', price: 200 },
  { id: 'title_collector', kind: 'title', name: '과일 수집가', icon: '🧺', price: 250 },
  { id: 'title_nightowl', kind: 'title', name: '밤샘 게이머', icon: '🌙', price: 250 },
  { id: 'title_lucky', kind: 'title', name: '행운의 주인공', icon: '🍀', price: 300 },
  { id: 'title_speedy', kind: 'title', name: '번개손', icon: '⚡', price: 350 },
  { id: 'title_swordsman', kind: 'title', name: '과일 검객', icon: '⚔️', price: 400 },
  { id: 'title_brain', kind: 'title', name: '퍼즐 박사', icon: '🧠', price: 400 },
  { id: 'title_rich', kind: 'title', name: '코인 부자', icon: '💰', price: 800 },
  { id: 'title_boss', kind: 'title', name: '과일 대장', icon: '🦁', price: 1000 },
  { id: 'title_legend', kind: 'title', name: '아케이드 전설', icon: '🏆', price: 1500 },

  // Memory card backs
  { id: 'back_stripes', kind: 'cardBack', name: '소다 줄무늬', price: 150 },
  { id: 'back_melon', kind: 'cardBack', name: '수박 물방울', price: 150 },
  { id: 'back_cherry', kind: 'cardBack', name: '체리 물방울', price: 150 },
  { id: 'back_lemon', kind: 'cardBack', name: '레몬 체크', price: 200 },
  { id: 'back_grape', kind: 'cardBack', name: '포도 줄무늬', price: 200 },
  { id: 'back_clover', kind: 'cardBack', name: '네잎클로버', price: 200 },
  { id: 'back_ocean', kind: 'cardBack', name: '바다 물결', price: 250 },
  { id: 'back_candy', kind: 'cardBack', name: '사탕 가게', price: 250 },
  { id: 'back_night', kind: 'cardBack', name: '밤하늘 별', price: 300 },
  { id: 'back_space', kind: 'cardBack', name: '우주 여행', price: 350 },
  { id: 'back_gold', kind: 'cardBack', name: '황금 왕관', price: 500 },
  { id: 'back_rainbow', kind: 'cardBack', name: '무지개', price: 600 },

  // 과일 자르기 blade trails
  { id: 'blade_berry', kind: 'blade', name: '딸기 칼날', price: 150 },
  { id: 'blade_melon', kind: 'blade', name: '멜론 칼날', price: 150 },
  { id: 'blade_grape', kind: 'blade', name: '포도 칼날', price: 200 },
  { id: 'blade_gold', kind: 'blade', name: '황금 칼날', price: 350 },
  { id: 'blade_fire', kind: 'blade', name: '불꽃 칼날', price: 400 },
  { id: 'blade_rainbow', kind: 'blade', name: '무지개 칼날', price: 700 },

  // FRUIT DASH runners
  { id: 'runner_berry', kind: 'runner', name: '딸기 러너', price: 200 },
  { id: 'runner_lemon', kind: 'runner', name: '레몬 러너', price: 200 },
  { id: 'runner_apple', kind: 'runner', name: '풋사과 러너', price: 250 },
  { id: 'runner_grape', kind: 'runner', name: '포도 러너', price: 250 },
  { id: 'runner_peach', kind: 'runner', name: '복숭아 러너', price: 300 },
  { id: 'runner_blueberry', kind: 'runner', name: '블루베리 러너', price: 350 },

  // 운영진 series
  staff({ id: 'staff_admin', kind: 'title', name: '운영자', icon: '🛡️' }),
  staff({ id: 'staff_gm', kind: 'title', name: '게임 마스터', icon: '🎮' }),
  staff({ id: 'staff_guardian', kind: 'title', name: '랭킹 수호자', icon: '⚖️' }),
  staff({ id: 'staff_dev', kind: 'title', name: '개발자', icon: '🛠️' }),
  staff({ id: 'staff_owner', kind: 'title', name: '아케이드 주인', icon: '🏰' }),
  staff({ id: 'staff_helper', kind: 'title', name: '친절한 도우미', icon: '💬' }),
  staff({ id: 'staff_frame_shield', kind: 'frame', name: '운영진 방패 테두리' }),
  staff({ id: 'staff_frame_aurora', kind: 'frame', name: '운영진 오로라 테두리' }),
  staff({ id: 'staff_back', kind: 'cardBack', name: '운영진 카드' }),
  staff({ id: 'staff_blade', kind: 'blade', name: '운영진 번개 칼날' }),
  staff({ id: 'staff_runner', kind: 'runner', name: '운영진 러너' }),
];

export const shopItem = (id: string | null | undefined) => (id ? (SHOP_ITEMS.find((i) => i.id === id) ?? null) : null);

/** Ring colors around the avatar (Tailwind classes kept as literals so they get generated) */
export const FRAME_CLASS: Record<string, string> = {
  frame_berry: 'bg-berry',
  frame_melon: 'bg-melon',
  frame_soda: 'bg-soda',
  frame_mango: 'bg-mango',
  frame_grape: 'bg-grape',
  frame_peach: 'bg-[linear-gradient(135deg,#ffd6a5,#ff8fab)]',
  frame_mint: 'bg-[linear-gradient(135deg,#a8f5e3,#3ddbb2_55%,#6b4226)]',
  frame_ocean: 'bg-[linear-gradient(135deg,#7ae1ff,#2ea9ff_50%,#1d4ed8)]',
  frame_sunset: 'bg-[linear-gradient(135deg,#ffd166,#ff7a59_50%,#8e44ad)]',
  frame_night: 'bg-[linear-gradient(135deg,#7a5cff,#1b1464_60%,#0b0b2b)]',
  frame_candy: 'bg-[repeating-linear-gradient(45deg,#ff4778_0_5px,#ffffff_5px_10px)]',
  frame_gold: 'bg-[linear-gradient(135deg,#fff1a8,#ffb627_45%,#e27d00)]',
  frame_neon: 'bg-[conic-gradient(#39ff14,#00e5ff,#ff2bd6,#39ff14)]',
  frame_fire: 'bg-[conic-gradient(#ff3d00,#ff9100,#ffea00,#ff9100,#ff3d00)]',
  frame_rainbow: 'bg-[conic-gradient(#ff4778,#ffb627,#2ec27e,#2ea9ff,#7a5cff,#ff4778)]',
  frame_diamond: 'bg-[conic-gradient(#e0f7ff,#9be7ff,#ffffff,#b39dff,#e0f7ff)]',
  staff_frame_shield: 'bg-[linear-gradient(135deg,#1e3a8a,#3b82f6_45%,#ffd23f_55%,#b45309)]',
  staff_frame_aurora: 'bg-[conic-gradient(#00ffa3,#00b3ff,#7a5cff,#ff4fd8,#ffd23f,#00ffa3)]',
};

/** Memory card backs: background pattern + the mark in the middle */
export const CARD_BACKS: Record<string, { className: string; mark: string }> = {
  '': { className: 'dots bg-berry', mark: '?' },
  back_stripes: { className: 'stripes bg-soda', mark: '?' },
  back_melon: { className: 'dots bg-melon', mark: '🍉' },
  back_cherry: { className: 'dots bg-[#e5383b]', mark: '🍒' },
  back_lemon: { className: 'checker bg-mango', mark: '🍋' },
  back_grape: { className: 'stripes bg-grape', mark: '🍇' },
  back_clover: { className: 'checker bg-melon', mark: '🍀' },
  back_ocean: { className: 'waves bg-soda', mark: '🐳' },
  back_candy: { className: 'stripes bg-[#ff8fab]', mark: '🍬' },
  back_night: { className: 'dots bg-grape-deep', mark: '⭐' },
  back_space: { className: 'dots bg-[#1b1464]', mark: '🚀' },
  back_gold: { className: 'stripes bg-mango', mark: '👑' },
  back_rainbow: { className: 'bg-[linear-gradient(135deg,#ff4778,#ffb627,#2ec27e,#2ea9ff,#7a5cff)]', mark: '🌈' },
  staff_back: { className: 'checker bg-[#1e3a8a]', mark: '🛡️' },
};

export const cardBackStyle = (id: string) => CARD_BACKS[id] ?? CARD_BACKS[''];

/** 과일 자르기 blade trail: glow and core as "r, g, b" ('' glow = the board's own color) */
export const BLADES: Record<string, { glow: string; core: string; rainbow?: boolean }> = {
  '': { glow: '', core: '255, 255, 255' },
  blade_berry: { glow: '255, 71, 120', core: '255, 240, 246' },
  blade_melon: { glow: '46, 194, 126', core: '240, 255, 246' },
  blade_grape: { glow: '122, 92, 255', core: '246, 242, 255' },
  blade_gold: { glow: '255, 182, 39', core: '255, 250, 220' },
  blade_fire: { glow: '255, 90, 20', core: '255, 230, 120' },
  blade_rainbow: { glow: '255, 255, 255', core: '255, 255, 255', rainbow: true },
  staff_blade: { glow: '59, 130, 246', core: '255, 215, 63' },
};

export const bladeStyle = (id: string) => BLADES[id] ?? BLADES[''];

/** FRUIT DASH runner colors (body, feet, leaf, face) */
export const RUNNERS: Record<string, { body: string; feet: string; leaf: string; face: string }> = {
  '': { body: '#ffb627', feet: '#e07800', leaf: '#2ec27e', face: '#2b2140' },
  runner_berry: { body: '#ff4d6d', feet: '#c9184a', leaf: '#2ec27e', face: '#2b2140' },
  runner_lemon: { body: '#ffe14d', feet: '#d4a600', leaf: '#2ec27e', face: '#2b2140' },
  runner_apple: { body: '#8fd16a', feet: '#4c8c2b', leaf: '#7a4b2a', face: '#2b2140' },
  runner_grape: { body: '#9b5de5', feet: '#6a3fb5', leaf: '#2ec27e', face: '#ffffff' },
  runner_peach: { body: '#ffb4a2', feet: '#e5737a', leaf: '#2ec27e', face: '#2b2140' },
  runner_blueberry: { body: '#4f6df5', feet: '#2a3eb1', leaf: '#2ec27e', face: '#ffffff' },
  staff_runner: { body: '#1e3a8a', feet: '#ffd23f', leaf: '#ffd23f', face: '#ffffff' },
};

export const runnerStyle = (id: string) => RUNNERS[id] ?? RUNNERS[''];

/** How much a finished round pays: 10 for playing, up to 40 for the score, plus bonuses */
export function coinsFor(r: GameResult, bonus: { newBest: boolean; stamp: boolean; firstToday: boolean }): number {
  const perScore = { memory: 10, suika: 150, dash: 15, puzzle: 60, slice: 25 }[r.game] ?? 100;
  let coins = 10 + Math.min(40, Math.floor(Math.max(0, r.score) / perScore));
  if (r.won) coins += 5;
  if (bonus.newBest) coins += 20;
  if (bonus.stamp) coins += 50;
  if (bonus.firstToday) coins += 10;
  return coins;
}

// ───────── inventory (item id → purchase date) ─────────

const INVENTORY_KEY = 'fruit_arcade_inventory';
export type Inventory = Record<string, string>;

export function loadInventory(): Inventory {
  try {
    const raw = JSON.parse(localStorage.getItem(INVENTORY_KEY) || '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Inventory) : {};
  } catch {
    return {};
  }
}

export function saveInventory(inv: Inventory): void {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  } catch {
    // storage full or blocked
  }
}

/** Union of both sides; only known, buyable item ids survive (staff items are never stored) */
export function mergeInventory(a: Inventory, b: Inventory): Inventory {
  const out: Inventory = {};
  for (const src of [a, b])
    for (const [id, at] of Object.entries(src)) if (shopItem(id) && !isStaffId(id) && !(id in out)) out[id] = String(at).slice(0, 40);
  return out;
}

/** What the player can use: what they bought, plus the whole 운영진 series for admins */
export function usableItems(inv: Inventory, isAdmin: boolean): Inventory {
  const out: Inventory = {};
  for (const [id, at] of Object.entries(inv)) if (!isStaffId(id)) out[id] = at;
  if (isAdmin) for (const item of SHOP_ITEMS) if (item.staff) out[item.id] = 'staff';
  return out;
}

/** The shop avatar item for an emoji, if it is one */
export const avatarItem = (emoji: string) => SHOP_ITEMS.find((i) => i.kind === 'avatar' && i.icon === emoji) ?? null;

export const clearInventory = () => {
  try {
    localStorage.removeItem(INVENTORY_KEY);
  } catch {
    // ignore
  }
};
