import React, { Suspense, lazy, useState } from 'react';

/**
 * A window whose code loads the first time it opens, not with the app. Until then it renders
 * nothing; afterwards it stays mounted like any other window (so closing still animates).
 */
export function lazyModal<P extends { isOpen: boolean }>(load: () => Promise<React.ComponentType<P>>): React.FC<P> {
  const Inner = lazy(() => load().then((Component) => ({ default: Component })));
  const Lazy: React.FC<P> = (props) => {
    const [opened, setOpened] = useState(props.isOpen);
    if (props.isOpen && !opened) setOpened(true);
    if (!opened) return null;
    return (
      <Suspense fallback={null}>
        <Inner {...(props as P & React.JSX.IntrinsicAttributes)} />
      </Suspense>
    );
  };
  return Lazy;
}
