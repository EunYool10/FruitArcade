import React, { useMemo, useState } from 'react';
import { Ban, ChevronDown, Copy, Pencil, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import type { LookChange, UserRow } from '../../utils/adminService';
import { AdminLookEditor } from './AdminLookEditor';
import { AvatarFace, Framed } from '../ui/Avatar';
import { TitleTag } from '../ui/TitleTag';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { PresenceTag } from '../ui/Presence';
import { ConfirmButton } from '../ui/ConfirmButton';
import { Emoji } from '../ui/Emoji';
import { titleDef } from '../../utils/titles';
import { isOnline } from '../../utils/presence';
import { GAMES, GAME_ORDER, TONE } from '../../constants';
import { formatNumber, formatTime, relativeTime } from '../../utils/format';

type Filter = 'all' | 'online' | 'today' | 'banned';
type Sort = 'seen' | 'new' | 'level' | 'name';

const FILTERS: [Filter, string][] = [
  ['all', '전체'],
  ['online', '🟢 접속 중'],
  ['today', '🎮 오늘 플레이'],
  ['banned', '🚫 차단됨'],
];
const SORTS: [Sort, string][] = [
  ['seen', '최근 접속순'],
  ['new', '프로필 갱신순'],
  ['level', '레벨순'],
  ['name', '이름순'],
];
/** Rows shown at first, and added by "더 보기" */
const PAGE = 60;

const showCode = (code: string) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code || '–');

interface Props {
  users: UserRow[] | null;
  /** Search text (the reports and bans tabs fill it in to jump to a player) */
  search: string;
  onSearch: (text: string) => void;
  busy: string | null;
  onBan: (u: UserRow) => void;
  onUnban: (u: UserRow) => void;
  onClearBoards: (u: UserRow) => void;
  onCopy: (text: string, what: string) => void;
  onChangeLook: (u: UserRow, c: LookChange) => void;
  onPrism: (u: UserRow, give: boolean) => void;
}

/** Every player with a public card: find them, see how they play, ban or clean up their records */
export const AdminUsers: React.FC<Props> = ({ users, search, onSearch, busy, onBan, onUnban, onClearBoards, onCopy, onChangeLook, onPrism }) => {
  const [filter, setFilter] = useState<Filter>('all');
  /** Whose look editor is open */
  const [editing, setEditing] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('seen');
  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const list = useMemo(() => {
    if (!users) return [];
    const q = search.trim().toLowerCase();
    const code = q.replace(/[^a-z0-9]/g, '');
    const now = Date.now();
    return users
      .filter((u) => {
        if (filter === 'online' && !isOnline(u.lastSeen, now)) return false;
        if (filter === 'today' && u.todayPlays === 0) return false;
        if (filter === 'banned' && !u.bannedAt) return false;
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          u.rawName.toLowerCase().includes(q) ||
          (code.length >= 4 && u.code.toLowerCase().includes(code)) ||
          u.uid.toLowerCase().startsWith(q)
        );
      })
      .sort((a, b) => {
        if (sort === 'level') return b.level - a.level || b.achievements - a.achievements;
        if (sort === 'name') return a.name.localeCompare(b.name, 'ko');
        if (sort === 'new') return b.cardAt - a.cardAt;
        return (b.lastSeen ?? 0) - (a.lastSeen ?? 0) || b.cardAt - a.cardAt;
      });
  }, [users, search, filter, sort]);

  if (!users) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">유저 찾기</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={2.5} />
          <input
            value={search}
            onChange={(e) => {
              onSearch(e.target.value);
              setShown(PAGE);
            }}
            placeholder="닉네임 · 친구 코드 · UID"
            className="h-10 w-full select-text rounded-xl border-2 border-line bg-surface pl-9 pr-9 text-sm outline-none focus:border-grape"
          />
          {search && (
            <button
              type="button"
              className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-surface-3"
              onClick={() => onSearch('')}
              aria-label="검색 지우기"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="정렬"
          className="h-10 shrink-0 rounded-xl border-2 border-line bg-surface px-2 text-sm font-bold outline-none focus:border-grape"
        >
          {SORTS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div role="group" aria-label="보기" className="flex gap-1.5 overflow-x-auto pb-0.5">
        {FILTERS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={filter === v}
            onClick={() => {
              setFilter(v);
              setShown(PAGE);
            }}
            className={`chip h-8 shrink-0 px-3 ${filter === v ? 'bg-grape text-white' : 'bg-surface-2 hover:bg-surface-3'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-xs font-bold text-ink-3">
        {list.length === users.length ? `${formatNumber(users.length)}명` : `${formatNumber(users.length)}명 중 ${formatNumber(list.length)}명`}
      </p>

      {list.length === 0 ? (
        <div className="well grid min-h-[120px] place-items-center p-6 text-center text-sm font-bold text-ink-2">맞는 유저가 없어요.</div>
      ) : (
        <ul className="space-y-1.5">
          {list.slice(0, shown).map((u) => {
            const expanded = open === u.uid;
            const t = titleDef(u.title);
            return (
              <li key={u.uid} className={`overflow-hidden rounded-2xl border-2 border-line ${u.bannedAt ? 'bg-berry-soft' : 'bg-surface-2'}`}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 p-2.5 text-left"
                  onClick={() => setOpen(expanded ? null : u.uid)}
                  aria-expanded={expanded}
                >
                  <Framed frame={u.frame}>
                    <AvatarFace emoji={u.avatar} photo={u.photo} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-line bg-mango-soft text-xl" />
                  </Framed>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-bold">{u.name}</span>
                      {u.verified && <VerifiedBadge />}
                      <span className="chip h-5 shrink-0 bg-surface px-1.5 text-[10px]">Lv.{u.level}</span>
                      {!!u.bannedAt && <span className="chip h-5 shrink-0 bg-berry-deep px-1.5 text-[10px] text-white">차단</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <PresenceTag at={u.lastSeen} />
                      {u.todayPlays > 0 && (
                        <span className="text-[11px] font-bold text-ink-3">
                          🎮 오늘 {formatNumber(u.todayPlays)}판 · {formatTime(u.todaySeconds)}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-ink-3 transition-transform ${expanded ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                </button>

                {expanded && (
                  <div className="space-y-2.5 border-t-2 border-line bg-surface p-3">
                    {u.rawName !== u.name && (
                      <p className="rounded-xl bg-berry-soft px-2.5 py-1.5 text-xs font-bold">⚠️ 실제 닉네임: {u.rawName} (다른 사람에게는 가려져 보여요)</p>
                    )}
                    {t && <TitleTag title={t} />}
                    <dl className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
                      {[
                        ['친구 코드', showCode(u.code)],
                        ['UID', `${u.uid.slice(0, 10)}…`],
                        ['업적', `${formatNumber(u.achievements)}개`],
                        ['프로필 갱신', u.cardAt ? relativeTime(u.cardAt) : '–'],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0 rounded-xl border-2 border-line bg-surface-2 px-2.5 py-1.5">
                          <dt className="text-[10px] font-bold text-ink-3">{label}</dt>
                          <dd className="truncate font-bold tabular-nums">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="grid grid-cols-4 gap-1.5">
                      {GAME_ORDER.map((g) => (
                        <div key={g} className={`min-w-0 rounded-xl border-2 border-line px-1 py-1.5 text-center ${TONE[GAMES[g].tone].soft}`}>
                          <p className="text-base leading-none" aria-hidden="true">
                            <Emoji e={GAMES[g].emoji} />
                          </p>
                          <p className="mt-0.5 truncate text-[10px] font-bold text-ink-2">{GAMES[g].short}</p>
                          <p className="truncate font-display text-xs tabular-nums">{u.best[g] ? formatNumber(u.best[g]!) : '–'}</p>
                        </div>
                      ))}
                    </div>
                    {u.bannedAt && <p className="text-xs font-bold text-berry-ink">🚫 {new Date(u.bannedAt).toLocaleDateString('ko-KR')}에 랭킹에서 차단됐어요</p>}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button type="button" className="btn btn-sm w-full" onClick={() => onCopy(u.uid, 'UID')}>
                        <Copy className="h-4 w-4" strokeWidth={2.5} /> UID 복사
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm w-full"
                        aria-expanded={editing === u.uid}
                        onClick={() => setEditing(editing === u.uid ? null : u.uid)}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={2.5} /> 프로필 바꾸기
                      </button>
                      <ConfirmButton
                        className="btn btn-sm w-full"
                        question={`${u.name}님의 오늘 · 이번 주 · 전체 랭킹 기록을 모두 지울까요?`}
                        confirmLabel="지우기"
                        onConfirm={() => onClearBoards(u)}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.5} /> 랭킹 기록 삭제
                      </ConfirmButton>
                      {u.bannedAt ? (
                        <button type="button" className="btn btn-sm btn-melon w-full" disabled={busy === u.uid} onClick={() => onUnban(u)}>
                          <ShieldCheck className="h-4 w-4" strokeWidth={2.5} /> 차단 해제
                        </button>
                      ) : (
                        <ConfirmButton
                          className="btn btn-sm btn-primary w-full"
                          question={`${u.name}님을 랭킹에서 차단할까요? 지금 순위표의 기록도 지워져요.`}
                          confirmLabel="차단하기"
                          onConfirm={() => onBan(u)}
                        >
                          <Ban className="h-4 w-4" strokeWidth={2.5} /> 차단
                        </ConfirmButton>
                      )}
                    </div>
                    {editing === u.uid && (
                      <AdminLookEditor
                        key={u.uid + u.cardAt}
                        u={u}
                        busy={busy === u.uid}
                        onSave={(c) => onChangeLook(u, c)}
                        onPrism={(give) => onPrism(u, give)}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {list.length > shown && (
        <button type="button" className="btn btn-sm w-full" onClick={() => setShown((n) => n + PAGE)}>
          더 보기 ({formatNumber(list.length - shown)}명 남음)
        </button>
      )}
    </div>
  );
};
