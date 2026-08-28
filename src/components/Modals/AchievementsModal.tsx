import React, { useState } from 'react';
import { Trophy, CheckCircle2, Lock, X } from 'lucide-react';
import { ACHIEVEMENT_DEFINITIONS, getUnlockedAchievements } from '../../utils/achievements';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  if (!isOpen) return null;

  const unlocked = getUnlockedAchievements();
  const totalCount = ACHIEVEMENT_DEFINITIONS.length;
  const unlockedCount = Object.keys(unlocked).length;
  const progressPct = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = ACHIEVEMENT_DEFINITIONS.filter((item) => {
    const isUnlocked = !!unlocked[item.id];
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <div
      id="achieve-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#141a29] to-[#0d111d] border border-orange-500/30 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        {/* Close Button */}
        <button
          id="close-achieve-x-btn"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 mb-2">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">명예의 도전 과제 보관함</h2>
          <p className="text-xs text-slate-400 mt-1">상큼과일 아케이드 마스터를 증명할 총 {totalCount}종의 명예 훈장입니다.</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-4">
          <div className="flex justify-between items-center text-xs font-bold mb-2">
            <span className="text-slate-300">달성 현황</span>
            <span className="text-orange-400">
              {unlockedCount} / {totalCount} ({progressPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mb-3">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              {f === 'all' ? '전체 보기' : f === 'unlocked' ? `달성됨 (${unlockedCount})` : `미달성 (${totalCount - unlockedCount})`}
            </button>
          ))}
        </div>

        {/* Achievement List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredAchievements.map((item) => {
            const isDone = !!unlocked[item.id];
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-100 shadow-sm'
                    : 'bg-slate-900/40 border-white/5 opacity-50 grayscale'
                }`}
              >
                <div className="text-2xl min-w-[36px] text-center">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-200 truncate">{item.title}</span>
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.desc}</div>
                  {isDone && <div className="text-[10px] text-emerald-400/80 mt-1 font-mono">달성일: {unlocked[item.id]}</div>}
                </div>
                <div className="shrink-0">
                  {isDone ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      달성완료
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-400 flex items-center gap-1 border border-white/10">
                      <Lock className="w-2.5 h-2.5" /> 잠김
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Close */}
        <button
          id="close-achieve-btn"
          onClick={onClose}
          className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold text-slate-300 transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
};
