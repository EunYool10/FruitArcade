import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { GameSettings, ThemeMode } from '../../types';
import { APP_VERSION, DEFAULT_SETTINGS } from '../../constants';
import { Modal } from '../ui/Modal';
import { SettingRow, Toggle } from '../ui/Toggle';
import { Segmented } from '../ui/Segmented';
import { ConfirmButton } from '../ui/ConfirmButton';
import { AdminRoster } from './AdminRoster';
import { promptInstall, usePwa } from '../../utils/pwa';
import { HAPTICS_SUPPORTED } from '../../utils/haptics';
import { notificationsBlocked, reminderSupport } from '../../utils/reminderState';

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

/** "오늘 한 판 해요!" in the evening before a streak would end (needs sign-in and web push) */
const Reminders: React.FC<{ loggedIn: boolean; on: boolean; busy: boolean; onToggle: (on: boolean) => void }> = ({
  loggedIn,
  on,
  busy,
  onToggle,
}) => {
  const support = reminderSupport();
  const blocked = notificationsBlocked();
  const desc = !loggedIn
    ? '로그인하면 쓸 수 있어요'
    : support === 'install'
      ? '아이폰 · 아이패드는 홈 화면에 설치한 앱에서만 알림을 받을 수 있어요'
      : support === 'unsupported'
        ? '이 브라우저는 알림을 지원하지 않아요'
        : blocked && !on
          ? '알림이 차단되어 있어요. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요'
          : '그날 아직 안 했으면 저녁 8시에 "오늘 한 판 해요!" 알림이 와요';
  const usable = loggedIn && support === 'ok' && (on || !blocked);
  return (
    <SettingRow title="연속 출석 알림" desc={desc}>
      <Toggle checked={loggedIn && on} onChange={onToggle} label="연속 출석 알림" disabled={!usable || busy} />
    </SettingRow>
  );
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  loggedIn: boolean;
  /** On the admin list: shows the QA mode switch */
  isAdmin?: boolean;
  /** Signed-in Google email (the admin list marks who is me) */
  myEmail?: string;
  onUpdateSettings: (next: GameSettings) => void;
  onResetAchievements: () => void;
  onResetRecords: () => void;
  onNotify: (msg: string) => void;
  onOpenFeedback: () => void;
  reminders: { on: boolean; busy: boolean };
  onToggleReminders: (on: boolean) => void;
  onOpenTerms: () => void;
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
  ['수박 망치 · 흔들기', '1 · 2'],
  ['게임 시작', 'Space · Enter'],
];

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  loggedIn,
  isAdmin = false,
  myEmail = '',
  onUpdateSettings,
  onResetAchievements,
  onResetRecords,
  onNotify,
  onOpenFeedback,
  reminders,
  onToggleReminders,
  onOpenTerms,
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
        {isAdmin && (
          <Section icon="🛡️" title="운영진">
            {toggle(
              'qaMode',
              '🧪 QA 모드',
              settings.qaMode
                ? '지금 일반 사용자처럼 보여요. 끄면 운영진으로 돌아가요'
                : '일반 사용자처럼 테스트해요. 코인 · 수박 아이템 무한, 운영진 물건, 관리자 버튼이 꺼져요'
            )}
            <p className="text-xs text-ink-3">닉네임과 서버의 관리자 권한은 그대로예요. 켜 둔 동안 산 물건은 진짜 코인으로 사요.</p>
            <AdminRoster isOpen={isOpen} myEmail={myEmail} />
          </Section>
        )}

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
          <SettingRow title="효과음 크기">
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                className="range w-32"
                min={0}
                max={100}
                value={settings.volume}
                disabled={!settings.sfxEnabled}
                onChange={(e) => set('volume', parseInt(e.target.value))}
                aria-label="효과음 크기"
              />
              <span className="w-10 text-right font-display text-sm tabular-nums">{settings.sfxEnabled ? `${settings.volume}%` : 'OFF'}</span>
            </div>
          </SettingRow>
          {toggle('bgmEnabled', '배경음악', '로비와 게임마다 다른 음악')}
          <SettingRow title="음악 크기">
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                className="range w-32"
                min={0}
                max={100}
                value={settings.bgmVolume}
                disabled={!settings.bgmEnabled}
                onChange={(e) => set('bgmVolume', parseInt(e.target.value))}
                aria-label="음악 크기"
              />
              <span className="w-10 text-right font-display text-sm tabular-nums">{settings.bgmEnabled ? `${settings.bgmVolume}%` : 'OFF'}</span>
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

        <Section icon="🔔" title="알림">
          <Reminders loggedIn={loggedIn} on={reminders.on} busy={reminders.busy} onToggle={onToggleReminders} />
        </Section>

        <Section icon="👥" title="친구">
          <SettingRow
            title="접속 상태 보이기"
            desc={
              settings.showPresence !== false
                ? '친구에게 온라인인지, 마지막으로 언제 접속했는지 보여요'
                : '친구에게 "접속 기록 없음"으로 보여요'
            }
          >
            <Toggle checked={settings.showPresence !== false} onChange={(v) => set('showPresence', v)} label="접속 상태 보이기" />
          </SettingRow>
        </Section>

        <Section icon="📲" title="앱">
          <AppInstall />
        </Section>

        <Section icon="💌" title="의견 · 도움">
          <SettingRow title="의견 · 버그 보내기" desc="불편한 점이나 바라는 기능을 운영자에게 바로 보내요">
            <button type="button" className="btn btn-sm btn-soda shrink-0" onClick={onOpenFeedback}>
              보내기
            </button>
          </SettingRow>
          <SettingRow title="이용약관 · 개인정보 처리방침" desc="어떤 정보를 모으고, 랭킹에 무엇이 공개되는지">
            <button type="button" className="btn btn-sm shrink-0" onClick={onOpenTerms}>
              보기
            </button>
          </SettingRow>
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
        <p className="text-center text-xs text-ink-3">상큼 과일 아케이드 존 v{APP_VERSION}</p>
      </div>
    </Modal>
  );
};
