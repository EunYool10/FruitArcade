import React from 'react';
import { ArrowLeft, ChevronRight, Zap } from 'lucide-react';
import { ScreenType, GameSettings } from '../types';
import { playSound } from '../utils/audio';

interface Props {
  onSelectGame: (screen: ScreenType) => void;
  onBack: () => void;
  settings: GameSettings;
}

export const GameSelectScreen: React.FC<Props> = ({ onSelectGame, onBack, settings }) => {
  const games = [
    {
      id: 'memory',
      title: '🍓 과일 메모리 게임',
      sub: '기억력 & 16종 업적 풀연동',
      desc: '똑같은 과일 카드 한 쌍을 맞추는 클래식 기억력 게임! 4x4, 6x6, 8x8 타임어택 및 조커 모드 지원.',
      accent: 'from-orange-500/20 to-amber-500/10 hover:border-orange-500/60',
      border: 'border-orange-500/30',
      tag: 'HOT',
      tagColor: 'bg-orange-500 text-white',
      screen: 'memory-setup' as ScreenType,
      active: true,
    },
    {
      id: 'suika',
      title: '🍉 수박 게임 (Suika)',
      sub: '물리 합성 & 거대 수박 완성',
      desc: '같은 과일끼리 닿으면 더 큰 과일로 진화! 상단 데드라인을 넘지 않고 수박을 완성하세요.',
      accent: 'from-emerald-500/20 to-teal-500/10 hover:border-emerald-500/60',
      border: 'border-emerald-500/30',
      tag: 'POPULAR',
      tagColor: 'bg-emerald-500 text-white',
      screen: 'suika' as ScreenType,
      active: true,
    },
    {
      id: 'dash',
      title: '🏃 FRUIT DASH (회피 질주)',
      sub: '쏟아지는 과일 회피 & 별빛 채집',
      desc: '하늘에서 떨어지는 과일 폭탄을 피하고 황금 별을 모아 최고 기록을 경신하세요!',
      accent: 'from-rose-500/20 to-amber-500/10 hover:border-rose-500/60',
      border: 'border-rose-500/30',
      tag: 'NEW',
      tagColor: 'bg-rose-500 text-white',
      screen: 'dash' as ScreenType,
      active: true,
    },
    {
      id: 'stock',
      title: '📊 주식 뉴스 트레이딩',
      sub: '뉴스 분석 & 2천만원 목표 달성',
      desc: '실시간 호재/악재 뉴스를 분석해 주식을 매수·매도하세요! 10라운드 안에 자산 2천만원을 달성하면 승리!',
      accent: 'from-blue-500/20 to-indigo-500/10 hover:border-blue-500/60',
      border: 'border-blue-500/30',
      tag: 'TRADING',
      tagColor: 'bg-blue-500 text-white',
      screen: 'stock' as ScreenType,
      active: true,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg w-full mx-auto my-auto animate-in fade-in zoom-in-95 duration-300 select-none">
      <div className="w-full bg-gradient-to-b from-[#141a29]/95 to-[#0f1422]/95 border border-orange-500/25 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-md flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="text-center mb-4 shrink-0">
          <div className="text-[11px] font-extrabold tracking-[0.2em] text-slate-400 uppercase">
            SELECT GAME
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight mt-0.5">
            플레이할 게임을 선택하세요
          </h2>
        </div>

        {/* Game List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {games.map((g) => (
            <div
              key={g.id}
              onClick={() => {
                if (g.active) {
                  playSound('click', settings);
                  onSelectGame(g.screen);
                }
              }}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left relative overflow-hidden flex items-center justify-between gap-4 group ${
                g.active
                  ? `bg-gradient-to-r ${g.accent} ${g.border} cursor-pointer hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0`
                  : 'bg-slate-900/40 border-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider ${g.tagColor}`}>
                    {g.tag}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-100 group-hover:text-orange-300 transition-colors truncate">
                    {g.title}
                  </h3>
                </div>
                <div className="text-xs font-semibold text-slate-300 mb-0.5">{g.sub}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{g.desc}</p>
              </div>

              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 group-hover:bg-orange-500 group-hover:text-white transition-all text-slate-400">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <button
          onClick={() => {
            playSound('click', settings);
            onBack();
          }}
          className="mt-3.5 w-full py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm font-bold text-slate-300 transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 메인 화면으로
        </button>
      </div>
    </div>
  );
};

