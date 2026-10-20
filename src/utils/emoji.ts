// Emoji as pictures (public/emoji, the same artwork Windows shows), so phones draw the same
// fruit as a PC instead of their own emoji font. Emoji without a picture fall back to text.
// Files are named by code points without the FE0F variation selector: 🍓 → 1f353.svg.

// Same list as the files in public/emoji
const AVAILABLE = new Set(
  (
    '1f0cf 1f31f 1f32e 1f330 1f331 1f336 1f33d 1f344 1f345 1f346 1f347 1f348 1f349 1f34a 1f34b 1f34c 1f34d 1f34e 1f34f ' +
    '1f350 1f351 1f352 1f353 1f354 1f355 1f360 1f366 1f369 1f370 1f389 1f3c3 1f409 1f419 1f41e 1f422 1f425 1f427 1f428 ' +
    '1f42f 1f430 1f431 1f433 1f436 1f438 1f439 1f43b 1f43c 1f451 1f47b 1f47e 1f494 1f4a1 1f4a3 1f4a5 1f4ab 1f525 1f528 1f52a ' +
    '1f680 1f6e1 1f90d 1f916 1f951 1f954 1f955 1f95c 1f95d 1f965 1f966 1f96d 1f977 1f984 1f989 1f98a 1f98b 1f996 1f9a5 ' +
    '1f9c1 1f9c4 1f9c5 1f9e9 1f9f2 1fad0 1fad1 1fae8 23f0 2728 2744 2764 2b50'
  ).split(' ')
);

const codeOf = (emoji: string) =>
  [...emoji.trim()]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((h) => h !== 'fe0f')
    .join('-');

/** URL of the emoji's picture, or null when there is none (then show the text) */
export function emojiSrc(emoji: string): string | null {
  const code = codeOf(emoji);
  return AVAILABLE.has(code) ? `${import.meta.env.BASE_URL}emoji/${code}.svg` : null;
}

// ───────── canvas ─────────

const images = new Map<string, HTMLImageElement>();
const bitmaps = new Map<string, HTMLCanvasElement>();
/** Pictures are drawn once at this size and scaled from there (cheap to draw every frame) */
const BITMAP_SIZE = 256;

/** Start loading pictures before a game needs them */
export function preloadEmoji(list: string[]): void {
  for (const e of list) bitmapOf(e);
}

function bitmapOf(emoji: string): HTMLCanvasElement | null {
  const src = emojiSrc(emoji);
  if (!src || typeof Image === 'undefined') return null;
  const ready = bitmaps.get(src);
  if (ready) return ready;
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = src;
    images.set(src, img);
  }
  if (!img.complete || !img.naturalWidth) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = BITMAP_SIZE;
  canvas.getContext('2d')?.drawImage(img, 0, 0, BITMAP_SIZE, BITMAP_SIZE);
  bitmaps.set(src, canvas);
  return canvas;
}

export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/**
 * Draw an emoji centred on (x, y), `size` px across: the picture when it has loaded,
 * otherwise the device's emoji glyph at the same size.
 */
export function drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number): void {
  const bmp = bitmapOf(emoji);
  if (bmp) {
    ctx.drawImage(bmp, x - size / 2, y - size / 2, size, size);
    return;
  }
  ctx.save();
  ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
  ctx.restore();
}
