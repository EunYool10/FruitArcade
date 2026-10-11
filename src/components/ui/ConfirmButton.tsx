import React, { useEffect, useRef, useState } from 'react';

interface ConfirmButtonProps {
  children: React.ReactNode;
  question: string;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
}

/** A button that asks "are you sure?" inline instead of using window.confirm. */
export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
  children,
  question,
  confirmLabel = '네, 할게요',
  onConfirm,
  className = 'btn',
}) => {
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (asking) cancelRef.current?.focus();
  }, [asking]);

  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-label={question} className="space-y-2 rounded-2xl border-2 border-line bg-berry-soft p-3">
      <p className="text-sm font-bold text-berry-ink">{question}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary flex-1"
          onClick={() => {
            setAsking(false);
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
        <button ref={cancelRef} type="button" className="btn btn-sm flex-1" onClick={() => setAsking(false)}>
          취소
        </button>
      </div>
    </div>
  );
};
