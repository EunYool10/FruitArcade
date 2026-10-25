// Emoji as pictures (public/emoji, the same artwork Windows shows), so phones draw the same
// fruit as a PC instead of their own emoji font. Emoji without a picture fall back to text.
// Files are named by code points without the FE0F variation selector: 🍓 → 1f353.svg.

// Same list as the files in public/emoji
const AVAILABLE = new Set(
  (
    '2139 2194 231b 2328 23eb 23f0 23f1 23f3 23f8 2600 2601 2604 2620 2694 2696 2699 ' +
    '26a0 26a1 26bd 26be 26c4 26d3 2705 270f 2728 2744 2753 2754 2764 2795 2b50 1f0cf ' +
    '1f300 1f305 1f308 1f30c 1f30e 1f311 1f315 1f319 1f31e 1f31f 1f327 1f32a 1f32d 1f32e 1f330 1f331 ' +
    '1f336 1f33d 1f340 1f344 1f345 1f346 1f347 1f348 1f349 1f34a 1f34b 1f34c 1f34d 1f34e 1f34f 1f350 ' +
    '1f351 1f352 1f353 1f354 1f355 1f359 1f35c 1f35f 1f360 1f361 1f364 1f366 1f369 1f36a 1f36b 1f36c ' +
    '1f36d 1f36e 1f36f 1f370 1f372 1f373 1f381 1f382 1f386 1f389 1f396 1f3a8 1f3ac 1f3ae 1f3af 1f3b1 ' +
    '1f3b5 1f3b6 1f3b9 1f3bc 1f3be 1f3c0 1f3c1 1f3c3 1f3c5 1f3c6 1f3c8 1f3d0 1f3d3 1f3db 1f3f0 1f3f7 ' +
    '1f3f8 1f409 1f40b 1f419 1f41b 1f41e 1f420 1f421 1f422 1f423 1f425 1f427 1f428 1f42c 1f42f 1f430 ' +
    '1f431 1f433 1f435 1f436 1f437 1f438 1f439 1f43b 1f43c 1f440 1f446 1f449 1f44b 1f451 1f464 1f465 ' +
    '1f47b 1f47e 1f48c 1f48e 1f494 1f496 1f4a1 1f4a3 1f4a5 1f4a7 1f4a8 1f4ab 1f4ac 1f4af 1f4b0 1f4b5 ' +
    '1f4bb 1f4c5 1f4c8 1f4c9 1f4ca 1f4cb 1f4cf 1f4dc 1f4dd 1f4e1 1f4e2 1f4e4 1f4e5 1f4ec 1f4ed 1f4ee ' +
    '1f4f1 1f4f2 1f500 1f501 1f50a 1f50d 1f50e 1f512 1f514 1f515 1f522 1f525 1f526 1f528 1f52a 1f52e ' +
    '1f54a 1f579 1f5bc 1f5c2 1f5d1 1f5d3 1f5fa 1f600 1f60e 1f622 1f624 1f62a 1f645 1f648 1f64a 1f680 ' +
    '1f6a8 1f6a9 1f6ab 1f6cd 1f6e0 1f6e1 1f7e2 1f90d 1f911 1f916 1f947 1f948 1f949 1f94a 1f94e 1f951 ' +
    '1f954 1f955 1f95c 1f95d 1f95f 1f964 1f965 1f966 1f967 1f96d 1f977 1f980 1f981 1f984 1f988 1f989 ' +
    '1f98a 1f98b 1f990 1f991 1f996 1f9a5 1f9ad 1f9c1 1f9c3 1f9c4 1f9c5 1f9d1-200d-1f33e 1f9d2 1f9e0 1f9e9 1f9ea ' +
    '1f9ed 1f9f2 1f9fa 1fa82 1fa90 1fa99 1fa9f 1fad0 1fad1 1fad9 1fae8 1faf8'
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
