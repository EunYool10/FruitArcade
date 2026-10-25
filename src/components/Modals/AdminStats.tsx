import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { AdminStats as Stats, DayStat } from '../../utils/adminService';
import { GAMES, GAME_ORDER } from '../../constants';
import { formatNumber } from '../../utils/format';
import { Emoji } from '../ui/Emoji';

type Metric = 'plays' | 'players' | 'seconds';
type Target = 'reports' | 'feedback' | 'bans';

/** "1시간 16분", "12분", "1분 47초", "45초" (seconds only matter under 10 minutes) */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  if (m < 10 && s % 60) return `${m}분 ${s % 60}초`;
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}시간 ${m % 60}분` : `${h}시간`;
}

const METRICS: Record<Metric, { label: string; show: (v: number) => string }> = {
  plays: { label: '판 수', show: (v) => `${formatNumber(v)}판` },
  players: { label: '플레이어', show: (v) => `${formatNumber(v)}명` },
  seconds: { label: '플레이 시간', show: formatDuration },
};

/** "10/17 (금)" -> "10/17" */
const shortDay = (label: string) => label.split(' ')[0];

/** Change against yesterday: up is good for every number here */
const Delta: React.FC<{ now: number; before: number; show: (v: number) => string }> = ({ now, before, show }) => {
  const diff = now - before;
  if (diff === 0) return <p className="mt-0.5 text-[11px] font-bold text-ink-3">어제와 같아요</p>;
  return (
    <p className={`mt-0.5 text-[11px] font-bold ${diff > 0 ? 'text-melon-ink' : 'text-berry-ink'}`}>
      {diff > 0 ? '▲' : '▼'} {show(Math.abs(diff))}{' '}
      {/* Phones: just the change (the card title says it's against yesterday) */}
      <span className="hidden font-semibold text-ink-3 sm:inline">· 어제 {show(before)}</span>
    </p>
  );
};

const Tile: React.FC<{ icon: string; label: string; value: string; children?: React.ReactNode }> = ({ icon, label, value, children }) => (
  <div className="min-w-0 rounded-2xl border-2 border-line bg-surface px-3 py-2.5">
    <p className="truncate text-[11px] font-bold text-ink-3">
      <span aria-hidden="true">{icon}</span> {label}
    </p>
    <p className="truncate font-display text-2xl leading-tight">{value}</p>
    {children}
  </div>
);

const Card: React.FC<{ title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ title, aside, children }) => (
  <section className="well space-y-3 p-3.5">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-display text-base">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

/**
 * Last 7 days of one measure. Today is the point, so it gets the accent and the other days stay
 * grey; only today and the busiest day carry a number, the rest show on hover, focus or tap.
 */
const Trend: React.FC<{ days: DayStat[]; metric: Metric }> = ({ days, metric }) => {
  const [active, setActive] = useState<number | null>(null);
  const { label, show } = METRICS[metric];
  const values = days.map((d) => d[metric]);
  const max = Math.max(1, ...values);
  const peak = values.indexOf(Math.max(...values));
  const last = days.length - 1;
  const total = values.reduce((a, b) => a + b, 0);
  const PLOT = 112;

  return (
    <figure className="m-0">
      <div className="relative" onPointerLeave={() => setActive(null)}>
        <div className="grid grid-cols-7 gap-1 border-b border-ink-3/30" style={{ height: PLOT + 18 }}>
          {days.map((d, i) => {
            const v = values[i];
            const h = v > 0 ? Math.max(4, Math.round((v / max) * PLOT)) : 2;
            const labelled = i === last || (i === peak && v > 0);
            return (
              <button
                key={d.label}
                type="button"
                className="group relative flex h-full flex-col items-center justify-end rounded-lg outline-none focus-visible:bg-surface-3"
                aria-label={`${d.label} ${show(v)}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
              >
                {labelled && <span className="mb-1 text-[11px] font-bold leading-none tabular-nums text-ink-2">{show(v)}</span>}
                <span
                  className={`block w-full max-w-[24px] rounded-t-[4px] transition-opacity ${i === last ? 'bg-grape' : 'bg-ink-3/40'} ${
                    active === i ? 'opacity-75' : ''
                  }`}
                  style={{ height: h }}
                />
              </button>
            );
          })}
        </div>
        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-line bg-surface px-2.5 py-1 shadow-hard-sm"
            style={{ left: `${((active + 0.5) / days.length) * 100}%` }}
          >
            <span className="font-display text-sm">{show(values[active])}</span>
            <span className="ml-1.5 text-[11px] font-bold text-ink-3">{days[active].label}</span>
          </div>
        )}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[10px] tabular-nums text-ink-3">
        {days.map((d, i) => (
          <span key={d.label} className={i === last ? 'font-bold text-ink' : ''}>
            {i === last ? '오늘' : shortDay(d.label)}
          </span>
        ))}
      </div>
      <figcaption className="mt-2 text-[11px] font-bold text-ink-3">
        7일 합계 {show(total)} · 하루 평균 {show(Math.round(total / days.length))}
        {values[peak] > 0 && ` · 가장 많은 날 ${shortDay(days[peak].label)}`}
      </figcaption>
      <table className="sr-only">
        <caption>최근 7일 {label}</caption>
        <tbody>
          {days.map((d, i) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{show(values[i])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
};

/** Today's leaderboard players per game, busiest first (one series, one colour) */
const ByGame: React.FC<{ counts: Stats['todayByGame'] }> = ({ counts }) => {
  const rows = [...GAME_ORDER].sort((a, b) => counts[b] - counts[a]);
  const max = Math.max(1, ...rows.map((g) => counts[g]));
  return (
    <ul className="space-y-1.5">
      {rows.map((g) => (
        <li key={g} className="flex items-center gap-2 text-sm">
          <span className="flex w-24 shrink-0 items-center gap-1.5 truncate font-bold">
            <Emoji e={GAMES[g].emoji} /> {GAMES[g].short}
          </span>
          <span className="relative h-3 min-w-0 flex-1">
            <span
              className={`absolute inset-y-0 left-0 rounded-r-[4px] ${counts[g] ? 'bg-grape' : 'bg-ink-3/30'}`}
              style={{ width: counts[g] ? `${Math.max(3, (counts[g] / max) * 100)}%` : 2 }}
            />
          </span>
          <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-ink-2">{formatNumber(counts[g])}명</span>
        </li>
      ))}
    </ul>
  );
};

interface Props {
  stats: Stats;
  /** Total users and online now (null until the user list loads) */
  people: { total: number; online: number } | null;
  /** The previous numbers stay on screen, dimmed, while new ones load */
  refreshing: boolean;
  onOpen: (tab: Target) => void;
}

/** The admin dashboard: today against yesterday, what needs doing, the week, and the games */
export const AdminStats: React.FC<Props> = ({ stats, people, refreshing, onOpen }) => {
  const [metric, setMetric] = useState<Metric>('plays');
  const today = stats.days[stats.days.length - 1];
  const yesterday = stats.days[stats.days.length - 2] ?? { plays: 0, players: 0, seconds: 0, label: '' };
  const perPlay = (d: Pick<DayStat, 'plays' | 'seconds'>) => (d.plays ? d.seconds / d.plays : 0);

  const todo: { id: Target; icon: string; label: string; count: number; unit: string; urgent: boolean }[] = [
    { id: 'reports', icon: '🚩', label: '처리 안 된 신고', count: stats.openReports, unit: '건', urgent: stats.openReports > 0 },
    { id: 'feedback', icon: '💬', label: '새 의견', count: stats.newFeedback, unit: '건', urgent: stats.newFeedback > 0 },
    { id: 'bans', icon: '🚫', label: '차단한 사람', count: stats.bans, unit: '명', urgent: false },
  ];
  const nothingToDo = !stats.openReports && !stats.newFeedback;

  return (
    <div className={`space-y-3 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
      <Card title="오늘" aside={<span className="text-[11px] font-bold text-ink-3">{today.label} · 어제와 비교</span>}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile icon="👥" label="플레이어" value={`${formatNumber(today.players)}명`}>
            <Delta now={today.players} before={yesterday.players} show={METRICS.players.show} />
          </Tile>
          <Tile icon="🎮" label="판 수" value={`${formatNumber(today.plays)}판`}>
            <Delta now={today.plays} before={yesterday.plays} show={METRICS.plays.show} />
          </Tile>
          <Tile icon="⏱️" label="플레이 시간" value={formatDuration(today.seconds)}>
            <Delta now={today.seconds} before={yesterday.seconds} show={formatDuration} />
          </Tile>
          <Tile icon="⌛" label="판당 평균" value={today.plays ? formatDuration(perPlay(today)) : '–'}>
            {today.plays > 0 && yesterday.plays > 0 && <Delta now={Math.round(perPlay(today))} before={Math.round(perPlay(yesterday))} show={formatDuration} />}
          </Tile>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ['🟢', '지금 접속', people ? `${formatNumber(people.online)}명` : '…'],
            ['👥', '전체 유저', people ? `${formatNumber(people.total)}명` : '…'],
            ['🏆', '랭킹 기록', `${formatNumber(stats.todayEntries)}개`],
          ].map(([icon, label, value]) => (
            <div key={label} className="min-w-0 rounded-xl bg-surface px-2 py-1.5">
              <dt className="truncate text-[10px] font-bold text-ink-3 sm:text-[11px]">
                <span aria-hidden="true">{icon}</span> {label}
              </dt>
              <dd className="truncate font-display text-base">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="할 일" aside={nothingToDo ? <span className="text-[11px] font-bold text-melon-ink">✅ 처리할 일이 없어요</span> : undefined}>
        <ul className="grid gap-1.5 sm:grid-cols-3">
          {todo.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onOpen(t.id)}
                className={`flex w-full items-center gap-2 rounded-xl border-2 border-line px-3 py-2 text-left text-sm font-bold transition-colors ${
                  t.urgent ? 'bg-berry-soft hover:brightness-95' : 'bg-surface hover:bg-surface-3'
                }`}
              >
                <span aria-hidden="true">{t.icon}</span>
                <span className="min-w-0 flex-1 truncate">{t.label}</span>
                <span className={`chip h-6 shrink-0 px-2 text-xs ${t.urgent ? 'bg-berry-deep text-white' : 'bg-surface-2'}`}>
                  {formatNumber(t.count)}
                  {t.unit}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2.5} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card
        title="최근 7일"
        aside={
          <div role="group" aria-label="보여 줄 값" className="flex gap-1">
            {(Object.keys(METRICS) as Metric[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={metric === m}
                onClick={() => setMetric(m)}
                className={`chip h-7 px-2.5 ${metric === m ? 'bg-grape text-white' : 'bg-surface hover:bg-surface-3'}`}
              >
                {METRICS[m].label}
              </button>
            ))}
          </div>
        }
      >
        <Trend days={stats.days} metric={metric} />
      </Card>

      <Card title="오늘 게임별 참가자" aside={<span className="text-[11px] font-bold text-ink-3">오늘 랭킹에 오른 사람</span>}>
        <ByGame counts={stats.todayByGame} />
      </Card>

      <p className="text-center text-[11px] text-ink-3">Google 로그인한 플레이어만 집계돼요 · 날짜는 한국 시간 기준</p>
    </div>
  );
};
