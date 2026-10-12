import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { GameSettings, ThemeMode } from '../../types';
import { DEFAULT_SETTINGS } from '../../constants';
import { Modal } from '../ui/Modal';
import { SettingRow, Toggle } from '../ui/Toggle';
import { Segmented } from '../ui/Segmented';
import { ConfirmButton } from '../ui/ConfirmButton';
import { promptInstall, usePwa } from '../../utils/pwa';
import { HAPTICS_SUPPORTED } from '../../utils/haptics';

/** Install instructions that fit the browser */
const AppInstall: React.FC = () => {
  const pwa = usePwa();
  if (pwa.installed) return <p className="text-sm font-bold text-melon-ink">✅ 앱으로 설치되어 있어요</p>;
  return (
    <div className="space-y-2">
      {pwa.canInstall ? (
        <button type="button" className="btn btn-soda w-full" onClick={() => promptInstall()}>
          📲 홈 화면에 설치
        </button>
      ) : pwa.ios ? (
        <p className="text-sm">
          Safari 아래쪽 <b>공유 버튼</b> → <b>홈 화면에 추가</b>를 눌러 주세요.
        </p>
      ) : (
        <p className="text-sm">브라우저 메뉴의 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러 주세요.</p>
      )}
      <p className="text-xs text-ink-3">설치하면 인터넷이 없어도 게임을 할 수 있어요. (로그인 · 클라우드 저장 제외)</p>
    </div>
  );
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  loggedIn: boolean;
  onUpdateSettings: (next: GameSettings) => void;
  onResetAchievements: () => void;
  onResetRecords: () => void;
  onNotify: (msg: string) => void;
}

type BoolKey = { [K in keyof GameSettings]: GameSettings[K] extends boolean ? K : never }[keyof GameSettings];

const Section: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="well space-y-3.5 p-4">
    <h3 className="flex items-center gap-2 font-display text-lg">
      <span aria-hidden="true">{icon}</span> {title}
    </h3>
    {children}
  </section>
);

const SHORTCUTS: [string, string][] = [
  ['일시정지 · 닫기', 'ESC'],
  ['메모리 플래시 힌트', 'H'],
  ['메모리 카드 힌트', 'C'],
  ['수박 · 대시 이동', '← → / A D'],
  ['수박 낙하', 'Space · ↓'],
  ['게임 시작', 'Space · Enter'],
];

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  loggedIn,
  onUpdateSettings,
  onResetAchievements,
  onResetRecords,
  onNotify,
}) => {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => onUpdateSettings({ ...settings, [key]: value });

  // Plain function (not a component) so the switches keep focus across re-renders
  const toggle = (key: BoolKey, title: string, desc: string) => (
    <SettingRow title={title} desc={desc}>
      <Toggle checked={settings[key]} onChange={(v) => set(key, v)} label={title} />
    </SettingRow>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="설정"
      subtitle="바꾸는 즉시 저장돼요"
      icon="⚙️"
      tone="grape"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              onUpdateSettings(DEFAULT_SETTINGS);
              onNotify('설정을 기본값으로 되돌렸어요');
            }}
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 기본값
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={onClose}>
            완료
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Section icon="🎨" title="화면">
          <Segmented<ThemeMode>
            ariaLabel="테마"
            columns={3}
            value={settings.theme}
            onChange={(v) => set('theme', v)}
            options={[
              { value: 'light', label: '☀️ 라이트' },
              { value: 'dark', label: '🌙 다크' },
              { value: 'system', label: '💻 시스템' },
            ]}
          />
        </Section>

        <Section icon="🔊" title="사운드">
          {toggle('sfxEnabled', '효과음', '뒤집기, 합성, 충돌 소리')}
          <SettingRow title="볼륨">
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                className="range w-32"
                min={0}
                max={100}
                value={settings.volume}
                disabled={!settings.sfxEnabled}
                onChange={(e) => set('volume', parseInt(e.target.value))}
                aria-label="볼륨"
              />
              <span className="w-10 text-right font-display text-sm tabular-nums">{settings.sfxEnabled ? `${settings.volume}%` : 'OFF'}</span>
            </div>
          </SettingRow>
        </Section>

        <Section icon="✨" title="연출">
          {toggle('animEnabled', '카드 회전', '메모리 카드를 부드럽게 뒤집어요')}
          {toggle('comboEffect', '콤보 · 파티클', '콤보 강조와 합성 파티클')}
          {toggle('shakeEffect', '흔들림', '틀린 카드와 수박 게임 화면 흔들림')}
          {toggle('celebrateEffect', '꽃가루', '클리어와 신기록 축하')}
          {HAPTICS_SUPPORTED && toggle('haptics', '진동', '합성 · 충돌 · 오답 때 짧게 진동')}
        </Section>

        <Section icon="👀" title="보기 편하게">
          {toggle('highContrast', '고대비 카드', '메모리 카드 테두리를 두껍게')}
          <SettingRow title="카드 크기" desc="메모리 게임판 크기">
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                className="range w-32"
                min={80}
                max={120}
                step={5}
                value={settings.cardScale}
                onChange={(e) => set('cardScale', parseInt(e.target.value))}
                aria-label="카드 크기"
              />
              <span className="w-10 text-right font-display text-sm tabular-nums">{settings.cardScale}%</span>
            </div>
          </SettingRow>
        </Section>

        <Section icon="⌨️" title="조작키">
          <dl className="grid gap-1.5 sm:grid-cols-2">
            {SHORTCUTS.map(([what, key]) => (
              <div key={what} className="flex items-center justify-between gap-2 rounded-xl border-2 border-line bg-surface px-3 py-2 text-xs">
                <dt className="font-semibold text-ink-2">{what}</dt>
                <dd className="font-display whitespace-nowrap">{key}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section icon="📲" title="앱">
          <AppInstall />
        </Section>

        <Section icon="🗑️" title="데이터">
          <p className="text-xs text-ink-3">
            {loggedIn ? '로그인 중이라 클라우드에 저장된 데이터도 함께 지워져요.' : '이 기기에 저장된 데이터가 지워져요.'}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ConfirmButton
              className="btn w-full"
              question="업적을 모두 지울까요?"
              confirmLabel="지우기"
              onConfirm={() => {
                onResetAchievements();
                onNotify('업적을 초기화했어요');
              }}
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 업적 초기화
            </ConfirmButton>
            <ConfirmButton
              className="btn w-full"
              question="최고 기록과 플레이 기록을 모두 지울까요?"
              confirmLabel="지우기"
              onConfirm={() => {
                onResetRecords();
                onNotify('기록을 초기화했어요');
              }}
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 기록 초기화
            </ConfirmButton>
          </div>
        </Section>
      </div>
    </Modal>
  );
};
