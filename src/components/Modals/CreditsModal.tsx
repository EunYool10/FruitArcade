import React from 'react';
import { Award, User, Code, Heart, X } from 'lucide-react';
import { unlockAchievement } from '../../utils/achievements';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUnlockAchieve: (id: string) => void;
}

export const CreditsModal: React.FC<Props> = ({ isOpen, onClose, onUnlockAchieve }) => {
  if (!isOpen) return null;

  return (
    <div
      id="credit-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#141a29] to-[#0d111d] border border-orange-500/30 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="mx-auto inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 mb-3">
          <Award className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-black text-slate-100 tracking-tight">📜 프로젝트 크레딧 (Credits)</h2>
        <div className="text-xs text-orange-400 font-bold mt-1">상큼 과일 아케이드 존 v2.0</div>

        <div className="my-5 p-4 rounded-2xl bg-white/5 border border-white/5 text-left space-y-3 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-orange-300 font-bold mb-1">
              <User className="w-3.5 h-3.5" /> 메인 개발자 (Lead Dev)
            </div>
            <p className="text-slate-300 pl-5 font-semibold">은율 — 전체 아키텍처 및 게임플레이 개발</p>
          </div>

          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
              <Code className="w-3.5 h-3.5" /> 서브 개발 & 기획
            </div>
            <ul className="text-slate-400 pl-5 space-y-1">
              <li>• 예찬 — QA 및 밸런스 검증</li>
              <li>• 윤성 — 아이디어 기획 및 시스템 디자인</li>
              <li>• 진 — 미니게임 모듈 제작 지원</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-4">
          플레이해주시는 모든 분들께 감사드립니다! <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-sm font-bold text-slate-200 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
};
