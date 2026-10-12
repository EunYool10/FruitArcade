import React, { useEffect, useState } from 'react';
import { Ban, Check, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import type { AdminStats, FeedbackItem, ReportItem } from '../../utils/adminService';
import type { BanEntry } from '../../utils/leaderboardService';
import { boardLabel } from '../../utils/ranking';
import { formatNumber, formatTime } from '../../utils/format';
import { Modal } from '../ui/Modal';
import { ConfirmButton } from '../ui/ConfirmButton';
import { BarChart } from '../ui/BarChart';

const adminApi = () => import('../../utils/adminService');
const rankApi = () => import('../../utils/leaderboardService');

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Signed-in admin's uid (bans record who made them) */
  adminUid: string | null;
}

type Tab = 'stats' | 'reports' | 'feedback' | 'bans';

const REASON: Record<ReportItem['reason'], string> = { name: '부적절한 닉네임', score: '의심스러운 점수', other: '기타' };
const KIND: Record<FeedbackItem['kind'], string> = { bug: '🐞 버그', idea: '💡 아이디어', other: '💬 기타' };

const when = (ms: number) =>
  ms ? new Date(ms).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const Empty: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="well grid min-h-[160px] place-items-center p-6 text-center">
    <div>
      <p className="text-3xl" aria-hidden="true">
        {icon}
      </p>
      <p className="mt-1 text-sm font-bold text-ink-2">{text}</p>
    </div>
  </div>
);

const Spinner = () => (
  <div className="grid h-[160px] place-items-center text-ink-3">
    <Loader2 className="h-7 w-7 animate-spin" aria-label="불러오는 중" />
  </div>
);

export const AdminModal: React.FC<Props> = ({ isOpen, onClose, adminUid }) => {
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportItem[] | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[] | null>(null);
  const [bans, setBans] = useState<BanEntry[] | null>(null);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (isOpen) setNotice(null);
  }, [isOpen]);

  // Counts for the tab badges and the stats page
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    adminApi()
      .then((api) => api.loadStats())
      .then((s) => alive && setStats(s))
      .catch((err) => {
        console.warn('Failed to load admin stats:', err);
        if (alive) setNotice({ text: '통계를 불러오지 못했어요.', ok: false });
      });
    return () => {
      alive = false;
    };
  }, [isOpen, reload]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    const fail = (what: string) => (err: unknown) => {
      console.warn(`Failed to load ${what}:`, err);
      if (alive) setNotice({ text: '목록을 불러오지 못했어요.', ok: false });
    };
    if (tab === 'reports') {
      setReports(null);
      adminApi()
        .then((api) => api.listReports(showDone))
        .then((r) => alive && setReports(r))
        .catch(fail('reports'));
    } else if (tab === 'feedback') {
      setFeedback(null);
      adminApi()
        .then((api) => api.listFeedback())
        .then((f) => alive && setFeedback([...f].sort((a, b) => (a.status === b.status ? b.at - a.at : a.status === 'new' ? -1 : 1))))
        .catch(fail('feedback'));
    } else if (tab === 'bans') {
      setBans(null);
      rankApi()
        .then((api) => api.listBans())
        .then((b) => alive && setBans(b))
        .catch(fail('bans'));
    }
    return () => {
      alive = false;
    };
  }, [isOpen, tab, showDone, reload]);

  /** Runs an admin action, then refreshes the lists and counts */
  const act = async (key: string, done: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
      setNotice({ text: done, ok: true });
      setReload((r) => r + 1);
    } catch (err) {
      console.warn('Admin action failed:', err);
      setNotice({ text: '처리하지 못했어요. 권한과 인터넷 연결을 확인해 주세요.', ok: false });
    } finally {
      setBusy(null);
    }
  };

  const today = stats?.days[stats.days.length - 1];
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'stats', label: '📊 통계' },
    { id: 'reports', label: '🚩 신고', badge: stats?.openReports },
    { id: 'feedback', label: '💬 의견', badge: stats?.newFeedback },
    { id: 'bans', label: '🚫 차단', badge: stats?.bans },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="관리자" subtitle="신고 · 의견 · 차단을 한곳에서" icon="🛡️" tone="grape" size="lg">
      <div role="tablist" aria-label="관리 메뉴" className="mb-4 grid grid-cols-4 gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative rounded-2xl border-2 border-line px-1 py-2 text-sm font-bold transition-all ${
              tab === t.id ? '-translate-y-0.5 bg-grape text-white shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {t.label}
            {!!t.badge && t.id !== 'bans' && (
              <span className="absolute -right-1.5 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-line bg-berry px-1 text-[10px] text-white">
                {t.badge > 99 ? '99+' : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <p role="status" className={`mb-3 rounded-2xl border-2 border-line px-3 py-2 text-sm font-bold ${notice.ok ? 'bg-melon-soft' : 'bg-berry-soft'}`}>
          {notice.text}
        </p>
      )}

      {tab === 'stats' &&
        (!stats ? (
          <Spinner />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['👥', '오늘 플레이어', `${formatNumber(today?.players ?? 0)}명`],
                ['🎮', '오늘 판 수', `${formatNumber(today?.plays ?? 0)}판`],
                ['⏱️', '오늘 플레이 시간', formatTime(today?.seconds ?? 0)],
                ['🏆', '오늘 랭킹 기록', `${formatNumber(stats.todayEntries)}개`],
                ['🚩', '처리 안 된 신고', `${formatNumber(stats.openReports)}건`],
                ['💬', '새 의견', `${formatNumber(stats.newFeedback)}건`],
              ].map(([icon, label, value]) => (
                <div key={label} className="well px-3 py-2.5">
                  <p className="text-[11px] font-bold text-ink-3">
                    <span aria-hidden="true">{icon}</span> {label}
                  </p>
                  <p className="font-display text-xl tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <div className="well p-3.5">
              <p className="mb-2 text-sm font-bold">최근 7일 판 수</p>
              <BarChart data={stats.days.map((d) => ({ label: d.label.split(' ')[0], value: d.plays }))} ariaLabel="최근 7일 판 수" tone="grape" />
            </div>
            <div className="well p-3.5">
              <p className="mb-2 text-sm font-bold">최근 7일 플레이어 수</p>
              <BarChart data={stats.days.map((d) => ({ label: d.label.split(' ')[0], value: d.players }))} ariaLabel="최근 7일 플레이어 수" tone="melon" />
            </div>
            <p className="text-center text-[11px] text-ink-3">Google 로그인한 플레이어만 집계돼요 · 날짜는 한국 시간 기준</p>
          </div>
        ))}

      {tab === 'reports' && (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-end gap-1.5 text-xs font-bold text-ink-2">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="h-4 w-4 accent-[var(--grape)]" />
            처리한 신고도 보기
          </label>
          {!reports ? (
            <Spinner />
          ) : reports.length === 0 ? (
            <Empty icon="🎉" text={showDone ? '신고가 없어요.' : '처리할 신고가 없어요.'} />
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className={`rounded-2xl border-2 border-line p-3 ${r.status === 'open' ? 'bg-surface-2' : 'bg-surface opacity-70'}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold">{r.targetName}</span>
                    <span className="chip h-6 bg-berry-soft px-2 text-[11px]">{REASON[r.reason]}</span>
                    {r.status === 'done' && <span className="chip h-6 bg-melon-soft px-2 text-[11px]">처리됨</span>}
                    <span className="ml-auto text-[11px] text-ink-3">{when(r.at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-2">
                    {boardLabel(r.board)} · {formatNumber(r.score)}점 · 신고한 사람 {r.reporter.slice(0, 6)}
                  </p>
                  {r.note && <p className="mt-1.5 rounded-xl bg-surface px-2.5 py-1.5 text-sm">“{r.note}”</p>}
                  {r.status === 'open' ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <ConfirmButton
                        className="btn btn-sm w-full"
                        question={`${r.targetName}님의 이 기록을 지울까요?`}
                        confirmLabel="지우기"
                        onConfirm={() =>
                          act(r.id, `${r.targetName}님의 기록을 지웠어요.`, async () => {
                            const api = await adminApi();
                            await api.deleteBoardEntry(r.board, r.target);
                            await api.closeReportsAbout(r.target);
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 기록 삭제
                      </ConfirmButton>
                      <ConfirmButton
                        className="btn btn-sm btn-primary w-full"
                        question={`${r.targetName}님을 랭킹에서 차단할까요? 지금 순위표의 기록도 지워져요.`}
                        confirmLabel="차단하기"
                        onConfirm={() =>
                          act(r.id, `${r.targetName}님을 차단했어요.`, async () => {
                            if (!adminUid) throw new Error('not signed in');
                            await (await rankApi()).banPlayer(adminUid, r.target, r.targetName);
                            await (await adminApi()).closeReportsAbout(r.target);
                          })
                        }
                      >
                        <Ban className="h-4 w-4" strokeWidth={2.5} /> 차단
                      </ConfirmButton>
                      <button
                        type="button"
                        className="btn btn-sm w-full"
                        disabled={busy === r.id}
                        onClick={() => act(r.id, '신고를 처리 완료로 바꿨어요.', async () => (await adminApi()).setReportStatus(r.id, 'done'))}
                      >
                        <Check className="h-4 w-4" strokeWidth={3} /> 문제없음
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm mt-2"
                      disabled={busy === r.id}
                      onClick={() => act(r.id, '신고를 다시 열었어요.', async () => (await adminApi()).setReportStatus(r.id, 'open'))}
                    >
                      <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 다시 열기
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'feedback' &&
        (!feedback ? (
          <Spinner />
        ) : feedback.length === 0 ? (
          <Empty icon="📭" text="아직 받은 의견이 없어요." />
        ) : (
          <ul className="space-y-2">
            {feedback.map((f) => (
              <li key={f.id} className={`rounded-2xl border-2 border-line p-3 ${f.status === 'new' ? 'bg-surface-2' : 'bg-surface opacity-70'}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="chip h-6 bg-soda-soft px-2 text-[11px]">{KIND[f.kind]}</span>
                  <span className="font-bold">{f.name}</span>
                  {f.status === 'new' && <span className="chip h-6 bg-berry px-2 text-[11px] text-white">NEW</span>}
                  <span className="ml-auto text-[11px] text-ink-3">{when(f.at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface px-3 py-2 text-sm">{f.message}</p>
                <p className="mt-1 text-[11px] text-ink-3">
                  v{f.version} · {f.device}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={busy === f.id}
                    onClick={() =>
                      act(f.id, f.status === 'new' ? '확인 완료로 표시했어요.' : '새 의견으로 되돌렸어요.', async () =>
                        (await adminApi()).setFeedbackStatus(f.id, f.status === 'new' ? 'done' : 'new')
                      )
                    }
                  >
                    {f.status === 'new' ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={3} /> 확인 완료
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4" strokeWidth={2.5} /> 새 의견으로
                      </>
                    )}
                  </button>
                  <ConfirmButton
                    className="btn btn-sm"
                    question="이 의견을 지울까요?"
                    confirmLabel="지우기"
                    onConfirm={() => act(f.id, '의견을 지웠어요.', async () => (await adminApi()).deleteFeedback(f.id))}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 삭제
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'bans' &&
        (!bans ? (
          <Spinner />
        ) : bans.length === 0 ? (
          <Empty icon="🕊️" text="차단된 사람이 없어요." />
        ) : (
          <ul className="space-y-1.5">
            {bans.map((b) => (
              <li key={b.uid} className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-bold">{b.name}</span>
                {b.at > 0 && <span className="shrink-0 text-xs text-ink-3">{new Date(b.at).toLocaleDateString('ko-KR')}</span>}
                <button
                  type="button"
                  className="btn btn-sm shrink-0"
                  disabled={busy === b.uid}
                  onClick={() => act(b.uid, `${b.name}님의 차단을 풀었어요.`, async () => (await rankApi()).unban(b.uid))}
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        ))}
    </Modal>
  );
};
