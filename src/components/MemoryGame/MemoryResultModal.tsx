import React from 'react';
import { RotateCcw, Home, Trophy, Flame, Clock, Gamepad2 } from 'lucide-react';
import { MemoryMode } from '../../types';
import { formatTime } from '../Common/GameTimer';

interface Props {
  isOpen: boolean;
  isWin: boolean;
  reason?: 'time' | 'life' | 'quit';
  score: number;
  maxCombo: number;
  timeElapsed: number;
  mode: MemoryMode;
  onRetry: () => void;
  onMenu: () => void;
}

export const MemoryResultModal: React.FC<Props> = ({
  isOpen,
  isWin,
  reason,
  score,
  maxCombo,
  timeElapsed,
  mode,
  onRetry,
  onMenu,
}) => {
  if (!isOpen) return null;

  const modeLabel =
    mode === '4' ? '4×4 쉬움' : mode === '6' ? '6×6 어려움' : mode === '8-joker' ? '8×8 조커 모드' : '8×8 타임어택';

  const formattedTime = formatTime(timeElapsed, true);

  return (
    <div
      id="result-screen"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-sm rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 text-center flex flex-col items-center border ${
          isWin
            ? 'bg-gradient-to-b from-[#0f241d] to-[#091511] border-emerald-500/40 shadow-emerald-950/50'
            : 'bg-gradient-to-b from-[#251216] to-[#12080a] border-rose-500/40 shadow-rose-950/50'
        }`}
      >
        {/* Result Icon */}
        <div className="text-5xl sm:text-6xl mb-2 animate-bounce">
          {isWin ? '🎉' : reason === 'time' ? '⏰' : reason === 'life' ? '💔' : '😵'}
        </div>

        {/* Title */}
        <h2
          className={`text-2xl sm:text-3xl font-black tracking-tight ${
            isWin ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isWin ? 'CLEAR!' : reason === 'time' ? 'TIME OVER' : reason === 'life' ? 'GAME OVER' : 'GAME OVER'}
        </h2>

        <p className="text-xs text-slate-400 mt-1 mb-5">
          {isWin
            ? '모든 카드를 맞췄습니다! 완벽해요!'
            : reason === 'time'
            ? '아쉽게도 제한 시간이 끝났습니다.'
            : reason === 'life'
            ? '오답 제한 횟수를 초과했습니다.'
            : '다음엔 꼭 클리어해 봐요!'}
        </p>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 gap-2 mb-6">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> 최종 점수
            </div>
            <div className="text-lg font-black text-slate-100 mt-0.5">{score}점</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" /> 최대 콤보
            </div>
            <div className="text-lg font-black text-slate-100 mt-0.5">{maxCombo}연속</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> 플레이 시간
            </div>
            <div className="text-base font-black text-blue-400 font-mono mt-0.5">{formattedTime}</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" /> 게임 모드
            </div>
            <div className="text-xs font-black text-slate-200 mt-1 truncate">{modeLabel}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2">
          <button
            id="result-retry-btn"
            onClick={onRetry}
            className="w-full btn-arcade-primary"
          >
            <RotateCcw className="w-4 h-4" /> 다시 도전하기
          </button>
          <button
            id="result-menu-btn"
            onClick={onMenu}
            className="w-full btn-arcade-secondary"
          >
            <Home className="w-4 h-4" /> 메인 메뉴로
          </button>
        </div>
      </div>
    </div>
  );
};
