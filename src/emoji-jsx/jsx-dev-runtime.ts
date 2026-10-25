// Dev-server twin of jsx-runtime.ts
import { Fragment, jsxDEV as reactJsxDEV } from 'react/jsx-dev-runtime';
import { withEmoji } from './withEmoji';

export { Fragment };

export const jsxDEV: typeof reactJsxDEV = (type, props, key, isStatic, source, self) =>
  reactJsxDEV(type, withEmoji(type, props), key, isStatic, source, self);
