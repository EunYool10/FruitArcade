// Emoji in on-screen text become the bundled pictures (public/emoji), so a phone shows the same
// emoji as a PC. The JSX runtime (jsx-runtime.ts) runs every element's text children through
// this before React sees them, which is safe with React's own DOM updates (nothing is patched
// afterwards). Only HTML/SVG tags' children are touched; attributes such as aria-label stay text.
import { jsx } from 'react/jsx-runtime';
import { emojiSrc } from '../utils/emoji';

/** Tags whose text must stay text (form options, SVG text, raw code) */
const SKIP = new Set(['option', 'optgroup', 'textarea', 'title', 'style', 'script', 'text', 'tspan', 'textPath', 'code', 'pre']);

const EMOJI = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*)/u;

/** Same look as <Emoji> (components/ui/Emoji.tsx) */
const IMG_CLASS = 'inline-block h-[1em] w-[1em] select-none align-[-0.125em]';

/** The text as text and pictures, or null when it has no emoji with a picture */
function split(text: string): (string | ReturnType<typeof jsx>)[] | null {
  if (!EMOJI.test(text)) return null;
  const parts = text.split(EMOJI);
  let changed = false;
  const out = parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const src = emojiSrc(part);
    if (!src) return part;
    changed = true;
    return jsx('img', { src, alt: part, draggable: false, className: IMG_CLASS }, `emoji-${i}`);
  });
  return changed ? out.filter((p) => p !== '') : null;
}

type Props = { children?: unknown } & Record<string, unknown>;

export function withEmoji<P>(type: unknown, props: P): P {
  const p = props as Props | null;
  if (typeof type !== 'string' || SKIP.has(type) || !p || p.children == null) return props;
  const c = p.children;
  if (typeof c === 'string') {
    const out = split(c);
    return out ? ({ ...p, children: out } as P) : props;
  }
  if (Array.isArray(c)) {
    let changed = false;
    const next = c.map((x) => {
      if (typeof x !== 'string') return x;
      const out = split(x);
      if (!out) return x;
      changed = true;
      return out;
    });
    return changed ? ({ ...p, children: next } as P) : props;
  }
  return props;
}
