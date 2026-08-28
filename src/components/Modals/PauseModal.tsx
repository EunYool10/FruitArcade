import React from 'react';
import { Play, Home, Pause } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onResume: () => void;
  onHome: () => void;
}

export const PauseModal: React.FC<Props> = ({ isOpen, onResume, onHome }) => {
  if (!isOpen) return null;

  return (
    <div
      id="pause-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xs bg-gradient-to-b from-[#141a29] to-[#0d111d] border border-orange-500/30 rounded-3xl p-7 shadow-2xl text-slate-100 text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-3 shadow-lg shadow-orange-500/10">
          <Pause className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black tracking-tight text-slate-100">일시정지 (PAUSE)</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">게임이 잠시 멈췄습니다</p>

        <div className="w-full space-y-2.5">
          <button
            id="pause-resume-btn"
            onClick={onResume}
            className="w-full btn-arcade-primary"
          >
            <Play className="w-4 h-4 fill-white" /> 계속하기
          </button>
          <button
            id="pause-menu-btn"
            onClick={onHome}
            className="w-full btn-arcade-secondary"
          >
            <Home className="w-4 h-4" /> 메인 메뉴로
          </button>
        </div>

        <div className="mt-5 text-[11px] text-slate-500 flex items-center gap-1.5 font-mono">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400">ESC</kbd> 키를 눌러 재개 가능
        </div>
      </div>
    </div>
  );
};
