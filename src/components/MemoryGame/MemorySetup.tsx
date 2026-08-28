import React, { useState } from 'react';
import { Play, ArrowLeft, AlertTriangle, Sparkles, Shield, Clock, Volume2 } from 'lucide-react';
import { MemoryMode, LifeLimit, GameSettings } from '../../types';
import { playSound } from '../../utils/audio';

interface Props {
  onStartGame: (mode: MemoryMode, previewTime: number, lifeLimit: LifeLimit) => void;
  onBack: () => void;
  settings: GameSettings;
  onToggleSound: () => void;
}

export const MemorySetup: React.FC<Props> = ({
  onStartGame,
  onBack,
  settings,
  onToggleSound,
}) => {
  const [mode, setMode] = useState<MemoryMode>('4');
  const [previewTime, setPreviewTime] = useState<number>(2000);
  const [lifeLimit, setLifeLimit] = useState<LifeLimit>('infinite');

  const showWarning = (mode === '8' || mode === '8-joker') && previewTime < 5000;

  const handleStart = () => {
    playSound('click', settings);
    onStartGame(mode, previewTime, lifeLimit);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-md w-full mx-auto my-auto animate-in fade-in zoom-in-95 duration-300">
      <div className="w-full bg-gradient-to-b from-[#141a29]/95 to-[#0f1422]/95 border border-orange-500/25 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="text-center mb-5 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black mb-2">
            <Sparkles className="w-3.5 h-3.5" /> MEMORY SETTING
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight">과일 메모리 게임 설정</h2>
          <p className="text-xs text-slate-400 mt-0.5">난이도와 플레이 옵션을 선택하세요</p>
        </div>

        {/* Form Options */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Game Mode */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300 block">📦 게임 모드 (크기/규칙)</label>
            <select
              id="board-size"
              value={mode}
              onChange={(e) => setMode(e.target.value as MemoryMode)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 border border-white/10 text-slate-200 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="4">4 x 4 (쉬움 · 16장)</option>
              <option value="6">6 x 6 (어려움 · 36장)</option>
              <option value="8">8 x 8 (일반 타임어택 · 64장 + 특수아이템)</option>
              <option value="8-joker">8 x 8 (스페셜 조커 모드 · 조커 8장)</option>
            </select>
          </div>

          {/* Preview Time */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-400" /> 첫 카드 기억 시간
              </label>
            </div>
            <select
              id="preview-time"
              value={previewTime}
              onChange={(e) => setPreviewTime(parseInt(e.target.value))}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 border border-white/10 text-slate-200 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value={2000}>2초 (기본값 · 4x4 추천)</option>
              <option value={3000}>3초 (여유롭게 · 4x4/6x6)</option>
              <option value={5000}>5초 (초보자 추천 · 8x8 권장)</option>
              <option value={7000}>7초 (8x8 추천)</option>
              <option value={10000}>10초 (8x8 여유롭게)</option>
            </select>

            {showWarning && (
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                8x8 모드는 기억 시간을 5초 이상으로 설정하는 것을 권장합니다!
              </div>
            )}
          </div>

          {/* Life Limit */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
            <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-rose-400" /> 오답 제한 (라이프)
            </label>
            <select
              id="life-limit"
              value={lifeLimit}
              onChange={(e) => setLifeLimit(e.target.value as LifeLimit)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800/90 border border-white/10 text-slate-200 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="infinite">무제한 (자유롭게 편안한 플레이)</option>
              <option value="10">10번 기회 (보통 긴장감)</option>
              <option value="5">5번 기회 (⚠️ 하드코어 업적 전용)</option>
            </select>
          </div>

          {/* Sound Toggle */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> 사운드 효과음
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">카드 뒤집기 및 매치 효과음</div>
            </div>
            <button
              onClick={onToggleSound}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                settings.sfxEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}
            >
              {settings.sfxEnabled ? '켜짐' : '꺼짐'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex gap-2 shrink-0">
          <button
            onClick={() => {
              playSound('click', settings);
              onBack();
            }}
            className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> 뒤로
          </button>

          <button
            id="start-btn"
            onClick={handleStart}
            className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:via-amber-400 hover:to-orange-500 text-white font-black text-sm shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" /> 상큼하게 시작! 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
