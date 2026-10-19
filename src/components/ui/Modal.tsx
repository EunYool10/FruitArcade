import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { TONE, Tone } from '../../constants';
import { Emoji } from './Emoji';
import { useModalLayer } from './modalStack';

interface ModalProps {
  isOpen: boolean;
  /** Omit to make the modal non-dismissible (no close button, no backdrop close). */
  onClose?: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Emoji or icon shown in the header sticker */
  icon?: React.ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-xl' };

/** Bottom sheet on phones, centered card from `sm` up. */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  tone = 'mango',
  size = 'md',
  footer,
  children,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Another window opened on top of this one: stay hidden until it closes
  const onTop = useModalLayer(isOpen);

  // Move focus into the dialog while open, and give it back afterwards
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => previous?.focus?.({ preventScroll: true });
  }, [isOpen]);

  // Back on top after the window above closed: take the focus again
  useEffect(() => {
    if (isOpen && onTop && !panelRef.current?.contains(document.activeElement)) panelRef.current?.focus({ preventScroll: true });
  }, [isOpen, onTop]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 items-end justify-center bg-[rgb(18_12_28/0.55)] animate-fade-in sm:items-center sm:p-6 ${onTop ? 'flex' : 'hidden'}`}
      onMouseDown={(e) => {
        if (onClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[88dvh] w-full flex-col rounded-t-[28px] border-2 border-line bg-surface outline-none animate-sheet-up sm:rounded-[28px] sm:shadow-pop-lg sm:animate-pop-in ${SIZES[size]}`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-ink-3/40 sm:hidden" aria-hidden="true" />
        <header className="flex shrink-0 items-start gap-3 px-5 pb-3 pt-3 sm:pt-5">
          {icon && (
            <span className={`sticker h-12 w-12 shrink-0 -rotate-6 text-2xl text-on-bright ${TONE[tone].bg}`} aria-hidden="true">
              {typeof icon === 'string' ? <Emoji e={icon} /> : icon}
            </span>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id={titleId} className="font-display text-2xl leading-tight">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} aria-label="닫기" className="btn btn-sm btn-icon shrink-0">
              <X className="h-4 w-4" strokeWidth={3} />
            </button>
          )}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
        {footer && <footer className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">{footer}</footer>}
      </div>
    </div>
  );
};
