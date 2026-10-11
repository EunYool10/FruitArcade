import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TONE, Tone } from '../../constants';

export interface Toast {
  id: number;
  icon: string;
  title: string;
  sub?: string;
  tone?: Tone;
}

/** Shows one toast at a time at the top of the screen. */
export const ToastHost: React.FC<{ toast?: Toast }> = ({ toast }) => (
  <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="panel flex max-w-full items-center gap-3 py-2 pl-2 pr-5"
        >
          <span className={`sticker h-10 w-10 shrink-0 text-xl ${TONE[toast.tone ?? 'mango'].bg}`} aria-hidden="true">
            {toast.icon}
          </span>
          <div className="min-w-0">
            {toast.sub && <p className="text-[11px] font-bold text-ink-2">{toast.sub}</p>}
            <p className="truncate font-display text-base leading-tight">{toast.title}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
