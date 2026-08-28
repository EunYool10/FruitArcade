import React from 'react';
import { Volume2, VolumeX, Eye, Sparkles, Sliders, RotateCcw, Keyboard, Trash2, X, Check } from 'lucide-react';
import { GameSettings } from '../../types';
import { resetAchievements } from '../../utils/achievements';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onNotify: (msg: string) => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onNotify,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: val });
  };

  const handleResetSettings = () => {
    onUpdateSettings({
      sfxEnabled: true,
      volume: 70,
      animEnabled: true,
      comboEffect: true,
      particleEffect: true,
      shakeEffect: true,
      celebrateEffect: true,
      highContrast: false,
      cardScale: 100,
    });
    onNotify('설정이 기본값으로 초기화되었습니다.');
  };

  const handleResetAchievements = () => {
    if (window.confirm('모든 업적 진행 상황을 초기화하시겠습니까?')) {
      resetAchievements();
      onNotify('업적이 모두 초기화되었습니다.');
    }
  };

  const handleResetSuikaHs = () => {
    if (window.confirm('수박 게임 최고 기록을 초기화하시겠습니까?')) {
      localStorage.removeItem('suika_hs');
      onNotify('수박 게임 최고 점수가 초기화되었습니다.');
    }
  };

  return (
    <div
      id="settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#141a29] to-[#0d111d] border border-orange-500/30 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          id="close-settings-x-btn"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 mb-2">
            <Sliders className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">게임 환경설정</h2>
          <p className="text-xs text-slate-400 mt-1">사운드, 그래픽 및 조작 옵션을 변경하세요</p>
        </div>

        {/* Settings Sections */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Sound Settings */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black tracking-wider text-orange-400 uppercase">
              <Volume2 className="w-4 h-4" /> 사운드 (Sound)
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-200">효과음 켜기</div>
                <div className="text-[11px] text-slate-400">뒤집기, 매칭, 터치 효과음</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="settings-sfx-toggle"
                  checked={settings.sfxEnabled}
                  onChange={(e) => handleChange('sfxEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-200">볼륨 크기</div>
              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  id="settings-volume"
                  min="0"
                  max="100"
                  value={settings.volume}
                  disabled={!settings.sfxEnabled}
                  onChange={(e) => handleChange('volume', parseInt(e.target.value))}
                  className="w-28 accent-orange-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-40"
                />
                <span className="text-xs font-mono font-bold text-orange-400 min-w-[32px] text-right">
                  {settings.sfxEnabled ? `${settings.volume}%` : 'OFF'}
                </span>
              </div>
            </div>
          </div>

          {/* Graphics & Effects */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black tracking-wider text-orange-400 uppercase">
              <Sparkles className="w-4 h-4" /> 그래픽 & 비주얼 (Visual)
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-200">카드 3D 회전 애니메이션</div>
                <div className="text-[11px] text-slate-400">부드러운 뒤집기 연출</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="settings-anim-toggle"
                  checked={settings.animEnabled}
                  onChange={(e) => handleChange('animEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-200">콤보 및 파티클 연출</div>
                <div className="text-[11px] text-slate-400">매칭 및 과일 합성 시 반짝임</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="settings-combo-toggle"
                  checked={settings.comboEffect}
                  onChange={(e) => handleChange('comboEffect', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-200">오답 흔들림 효과</div>
                <div className="text-[11px] text-slate-400">틀렸을 때 카드 흔들림</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="settings-shake-toggle"
                  checked={settings.shakeEffect}
                  onChange={(e) => handleChange('shakeEffect', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>

          {/* Accessibility & Sizing */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black tracking-wider text-orange-400 uppercase">
              <Eye className="w-4 h-4" /> 접근성 및 크기
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-200">고대비 카드 테두리</div>
                <div className="text-[11px] text-slate-400">진한 블루 테두리 및 명암 강조</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="settings-contrast-toggle"
                  checked={settings.highContrast}
                  onChange={(e) => handleChange('highContrast', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-bold text-slate-200">카드 스케일 크기</div>
              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  id="settings-card-size"
                  min="80"
                  max="120"
                  value={settings.cardScale}
                  onChange={(e) => handleChange('cardScale', parseInt(e.target.value))}
                  className="w-28 accent-orange-500 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-orange-400 min-w-[36px] text-right">
                  {settings.cardScale}%
                </span>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-black tracking-wider text-orange-400 uppercase">
              <Keyboard className="w-4 h-4" /> 키보드 단축키
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">일시정지</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-orange-300 border border-slate-700">ESC</kbd>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">플래시 힌트</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-orange-300 border border-slate-700">H</kbd>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">주식 매수</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-emerald-400 border border-slate-700">B</kbd>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">주식 매도</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-rose-400 border border-slate-700">S</kbd>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">다음 라운드</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-blue-400 border border-slate-700">N</kbd>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">수박 이동/낙하</span>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] text-amber-300 border border-slate-700">마우스/터치</kbd>
              </div>
            </div>
          </div>

          {/* Data Reset */}
          <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
            <div className="text-xs font-black tracking-wider text-rose-400 uppercase">데이터 관리</div>
            <div className="flex gap-2">
              <button
                id="settings-reset-achieve-btn"
                onClick={handleResetAchievements}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> 업적 초기화
              </button>
              <button
                id="settings-reset-suika-btn"
                onClick={handleResetSuikaHs}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> 수박 최고점 리셋
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            id="settings-reset-btn"
            onClick={handleResetSettings}
            className="h-[var(--ui-btn-h-lg)] min-h-[44px] flex items-center justify-center gap-1.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 초기화
          </button>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="h-[var(--ui-btn-h-lg)] min-h-[44px] flex-1 flex items-center justify-center gap-1.5 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" /> 설정 저장 완료
          </button>
        </div>
      </div>
    </div>
  );
};
