// React's JSX runtime with emoji in text turned into pictures (see withEmoji.ts).
// vite.config.ts points the JSX compiler here (jsxImportSource).
import { Fragment, jsx as reactJsx, jsxs as reactJsxs } from 'react/jsx-runtime';
import { withEmoji } from './withEmoji';

export { Fragment };

export const jsx: typeof reactJsx = (type, props, key) => reactJsx(type, withEmoji(type, props), key);
export const jsxs: typeof reactJsxs = (type, props, key) => reactJsxs(type, withEmoji(type, props), key);
