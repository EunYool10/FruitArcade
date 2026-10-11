import React from 'react';
import { Home, Play, RotateCcw } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface Props {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export const PauseModal: React.FC<Props> = ({ isOpen, onResume, onRestart, onExit }) => (
  <Modal isOpen={isOpen} onClose={onResume} title="잠깐 쉬는 중" subtitle="준비되면 계속해요" icon="⏸️" tone="mango" size="sm">
    <div className="space-y-2.5">
      <button type="button" onClick={onResume} className="btn btn-lg btn-primary w-full" autoFocus>
        <Play className="h-5 w-5 fill-current" /> 계속하기
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onRestart} className="btn">
          <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 처음부터
        </button>
        <button type="button" onClick={onExit} className="btn">
          <Home className="h-4 w-4" strokeWidth={2.5} /> 나가기
        </button>
      </div>
    </div>
    <p className="mt-4 text-center text-xs text-ink-3">
      <span className="kbd">ESC</span> 키로 계속하기
    </p>
  </Modal>
);
