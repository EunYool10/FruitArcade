import React from 'react';
import { Play, Trophy, FileText, Settings, Award, LogOut } from 'lucide-react';
import { playSound } from '../utils/audio';
import { GameSettings } from '../types';

interface Props {
  onStart: () => void;
  onOpenAchievements: () => void;
  onOpenPatchNotes: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
  settings: GameSettings;
}

export const IntroScreen: React.FC<Props> = ({
  onStart,
  onOpenAchievements,
  onOpenPatchNotes,
  onOpenSettings,
  onOpenCredits,
  settings,
}) => {
  const handleExit = () => {
    playSound('click', settings);
    if (window.confirm('게임을 종료하시겠습니까?')) {
      window.close();
    }
  };

  return (
    <div className="w-full flex items-center justify-center px-3 py-2 select-none">
      {/* Central Main Menu Card */}
      <div
        id="main-menu-card"
        className="w-full max-w-[460px] rounded-[18px] bg-[#131724]/92 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_40px_rgba(255,122,0,0.04)] p-6 sm:p-7 md:p-8 flex flex-col items-center text-center relative overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-44 h-44 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 1. Header Title Area */}
        <div className="relative w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-2.5 leading-none">
            <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(255,122,0,0.5)]">🍓</span>
            <h1 className="text-[28px] sm:text-[30px] font-black tracking-tight text-white leading-none whitespace-nowrap">
              FRUIT ARCADE
            </h1>
            <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">🍉</span>
          </div>

          <div className="text-xs font-medium text-slate-400/80 tracking-widest mt-2 uppercase">
            상큼 과일 아케이드 존
          </div>

          {/* 2. Description */}
          <p className="text-sm text-slate-300/90 font-normal leading-relaxed max-w-[360px] mx-auto mt-5">
            <span className="font-bold text-white">4가지</span> 과일 게임과{' '}
            <span className="font-bold text-orange-400">21종 명예의 업적</span>에 도전하세요!
          </p>
        </div>

        {/* 3. Main Start CTA Button */}
        <button
          id="play-nav-btn"
          onClick={() => {
            playSound('click', settings);
            onStart();
          }}
          className="w-full h-[52px] mt-[22px] rounded-xl bg-[#ff7a00] hover:bg-[#ff881a] active:bg-[#e66e00] text-white font-black text-base shadow-[0_4px_20px_rgba(255,122,0,0.35)] hover:shadow-[0_6px_24px_rgba(255,122,0,0.45)] hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>게임 시작하기</span>
        </button>

        {/* 4. General Menu Buttons Group */}
        <div className="w-full mt-3 space-y-2">
          <button
            id="open-achieve-btn"
            onClick={() => {
              playSound('click', settings);
              onOpenAchievements();
            }}
            className="w-full h-[44px] rounded-xl bg-white/[0.055] hover:bg-white/[0.09] active:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-slate-200 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>명예의 전당 (업적 21종)</span>
          </button>

          <button
            id="open-patch-btn"
            onClick={() => {
              playSound('click', settings);
              onOpenPatchNotes();
            }}
            className="w-full h-[44px] rounded-xl bg-white/[0.055] hover:bg-white/[0.09] active:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-slate-200 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>패치노트 (v2.0)</span>
          </button>

          <button
            id="open-settings-intro-btn"
            onClick={() => {
              playSound('click', settings);
              onOpenSettings();
            }}
            className="w-full h-[44px] rounded-xl bg-white/[0.055] hover:bg-white/[0.09] active:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-slate-200 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>게임 환경설정</span>
          </button>

          <button
            id="credit-btn"
            onClick={() => {
              playSound('click', settings);
              onOpenCredits();
            }}
            className="w-full h-[44px] rounded-xl bg-white/[0.055] hover:bg-white/[0.09] active:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14] text-slate-300 hover:text-white font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer"
          >
            <Award className="w-4 h-4 text-purple-400" />
            <span>크레딧 (Credits)</span>
          </button>
        </div>

        {/* 5. Exit Game Button */}
        <button
          id="exit-btn"
          onClick={handleExit}
          className="w-full h-[44px] mt-3 rounded-xl bg-rose-500/[0.12] hover:bg-rose-500/[0.20] active:bg-rose-500/[0.08] border border-rose-500/35 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>게임 종료하기</span>
        </button>

        {/* 6. Version Footer */}
        <div className="mt-4 text-[11px] text-slate-400/60 font-mono tracking-wide">
          v2.0.0 • Fruit Arcade Zone
        </div>
      </div>
    </div>
  );
};

