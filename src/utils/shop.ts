import { GameResult } from '../types';

// Coins and the cosmetics shop. Items only change looks, so the client keeps the books;
// the inventory is merged across devices (union) like achievements.

export type ItemKind = 'frame' | 'cardBack';

export interface ShopItem {
  id: string;
  kind: ItemKind;
  name: string;
  price: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'frame_berry', kind: 'frame', name: '딸기 테두리', price: 100 },
  { id: 'frame_melon', kind: 'frame', name: '멜론 테두리', price: 100 },
  { id: 'frame_soda', kind: 'frame', name: '소다 테두리', price: 100 },
  { id: 'frame_grape', kind: 'frame', name: '포도 테두리', price: 150 },
  { id: 'frame_gold', kind: 'frame', name: '황금 테두리', price: 400 },
  { id: 'frame_rainbow', kind: 'frame', name: '무지개 테두리', price: 600 },
  { id: 'back_stripes', kind: 'cardBack', name: '소다 줄무늬', price: 150 },
  { id: 'back_melon', kind: 'cardBack', name: '수박 물방울', price: 150 },
  { id: 'back_grape', kind: 'cardBack', name: '포도 줄무늬', price: 200 },
  { id: 'back_night', kind: 'cardBack', name: '밤하늘 별', price: 300 },
  { id: 'back_gold', kind: 'cardBack', name: '황금 왕관', price: 500 },
];

export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id) ?? null;

/** Ring colors around the avatar (Tailwind classes kept as literals so they get generated) */
export const FRAME_CLASS: Record<string, string> = {
  frame_berry: 'bg-berry',
  frame_melon: 'bg-melon',
  frame_soda: 'bg-soda',
  frame_grape: 'bg-grape',
  frame_gold: 'bg-[linear-gradient(135deg,#fff1a8,#ffb627_45%,#e27d00)]',
  frame_rainbow: 'bg-[conic-gradient(#ff4778,#ffb627,#2ec27e,#2ea9ff,#7a5cff,#ff4778)]',
};

/** Memory card backs: background pattern + the mark in the middle */
export const CARD_BACKS: Record<string, { className: string; mark: string }> = {
  '': { className: 'dots bg-berry', mark: '?' },
  back_stripes: { className: 'stripes bg-soda', mark: '?' },
  back_melon: { className: 'dots bg-melon', mark: '🍉' },
  back_grape: { className: 'stripes bg-grape', mark: '🍇' },
  back_night: { className: 'dots bg-grape-deep', mark: '⭐' },
  back_gold: { className: 'stripes bg-mango', mark: '👑' },
};

export const cardBackStyle = (id: string) => CARD_BACKS[id] ?? CARD_BACKS[''];

/** How much a finished round pays: 10 for playing, up to 40 for the score, plus bonuses */
export function coinsFor(r: GameResult, bonus: { newBest: boolean; stamp: boolean; firstToday: boolean }): number {
  const perScore = { memory: 10, suika: 150, dash: 15, puzzle: 60 }[r.game] ?? 100;
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

/** Union of both sides; only known item ids survive */
export function mergeInventory(a: Inventory, b: Inventory): Inventory {
  const out: Inventory = {};
  for (const src of [a, b]) for (const [id, at] of Object.entries(src)) if (shopItem(id) && !(id in out)) out[id] = String(at).slice(0, 40);
  return out;
}

export const clearInventory = () => {
  try {
    localStorage.removeItem(INVENTORY_KEY);
  } catch {
    // ignore
  }
};
