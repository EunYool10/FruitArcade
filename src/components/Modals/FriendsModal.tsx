import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Gift, Loader2, MoreHorizontal, Search, Share2, UserPlus, UserRound, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ConfirmButton } from '../ui/ConfirmButton';
import { AvatarFace, Framed } from '../ui/Avatar';
import { TitleTag } from '../ui/TitleTag';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { PresenceTag } from '../ui/Presence';
import { Emoji } from '../ui/Emoji';
import { titleDef } from '../../utils/titles';
import { formatCompact, formatNumber, josa, relativeTime } from '../../utils/format';
import { GAMES, GAME_ORDER } from '../../constants';
import { isOnline } from '../../utils/presence';
import { COIN_MAX, GIFT_LIMITS } from '../../utils/coins';
import type { FriendLink, Gift as GiftDoc, PublicPlayer } from '../../utils/friendsService';

const friendsApi = () => import('../../utils/friendsService');

export type SendResult = 'ok' | 'limit' | 'coins' | 'error';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** null for guests */
  uid: string | null;
  isAdmin: boolean;
  /** My friend code ('' until the card is made) */
  myCode: string;
  /** Infinity for admins */
  balance: number;
  onLogin: () => void;
  onSendCoins: (to: string, amount: number) => Promise<SendResult>;
  /** Claims the gifts; resolves to the coins added */
  onClaimGifts: (ids: string[]) => Promise<number>;
  onViewPlayer: (uid: string) => void;
  /** Something changed (requests, gifts): refresh the badge */
  onChanged: () => void;
  onNotify: (icon: string, title: string, sub?: string) => void;
}

type Tab = 'friends' | 'requests' | 'gifts';

const PLAYER_AMOUNTS = [10, 50, 100, 300];
const ADMIN_AMOUNTS = [1_000, 10_000, 1_000_000, 100_000_000, COIN_MAX];

/** Sending coins to one friend: quick amounts or a typed one, and what's left afterwards */
export const GiftForm: React.FC<{
  name: string;
  isAdmin: boolean;
  /** Infinity for admins */
  balance: number;
  sentToday: number;
  busy: boolean;
  amount: string;
  onAmount: (digits: string) => void;
  onSend: () => void;
}> = ({ name, isAdmin, balance, sentToday, busy, amount, onAmount, onSend }) => {
  const limits = isAdmin ? GIFT_LIMITS.admin : GIFT_LIMITS.player;
  const n = Number(amount) || 0;
  const left = balance - n;
  const problem =
    sentToday >= limits.perDay
      ? '오늘 보낼 수 있는 선물을 다 보냈어요. 내일 다시 보낼 수 있어요.'
      : n > limits.max
        ? `한 번에 ${formatNumber(limits.max)}코인까지 보낼 수 있어요.`
        : left < 0
          ? '코인이 모자라요.'
          : '';
  return (
    <div className="mt-2.5 space-y-2.5 rounded-2xl border-2 border-line bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">🪙 {name}님에게 보내기</p>
        {isAdmin ? (
          <span className="chip h-6 bg-[#1e3a8a] px-2 text-[11px] text-white">🛡️ 운영진 · 횟수 · 금액 제한 없음</span>
        ) : (
          <span className="chip h-6 bg-surface-2 px-2 text-[11px]">
            오늘 {sentToday}/{limits.perDay}번 · 한 번에 {limits.max}코인까지
          </span>
        )}
      </div>
      <div className={`grid gap-1.5 ${isAdmin ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-4'}`}>
        {(isAdmin ? ADMIN_AMOUNTS : PLAYER_AMOUNTS).map((a) => (
          <button
            key={a}
            type="button"
            aria-pressed={amount === String(a)}
            onClick={() => onAmount(String(a))}
            className={`h-10 rounded-xl border-2 border-line text-sm font-bold tabular-nums transition-all ${
              amount === String(a) ? '-translate-y-0.5 bg-mango text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {a === COIN_MAX ? '최대' : formatCompact(a)}
          </button>
        ))}
      </div>
      <label className="relative block">
        <span className="sr-only">보낼 코인</span>
        <input
          value={amount ? formatNumber(n) : ''}
          onChange={(e) => onAmount(e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(0, String(COIN_MAX).length))}
          inputMode="numeric"
          placeholder="직접 입력"
          className="h-11 w-full select-text rounded-xl border-2 border-line bg-surface-2 pl-3 pr-12 text-right font-display text-lg tabular-nums outline-none focus:border-mango"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-3">코인</span>
      </label>
      <dl className="grid grid-cols-2 gap-1.5">
        <div className="rounded-xl bg-surface-2 px-2.5 py-1.5">
          <dt className="text-[10px] font-bold text-ink-3">지금 내 코인</dt>
          <dd className="font-display text-sm tabular-nums">{Number.isFinite(balance) ? formatCompact(balance) : '∞'}</dd>
        </div>
        <div className={`rounded-xl px-2.5 py-1.5 ${left < 0 ? 'bg-berry-soft' : 'bg-surface-2'}`}>
          <dt className="text-[10px] font-bold text-ink-3">보낸 뒤</dt>
          <dd className="font-display text-sm tabular-nums">
            {!Number.isFinite(left) ? '∞' : left < 0 ? `${formatCompact(-left)} 모자라요` : formatCompact(left)}
          </dd>
        </div>
      </dl>
      {problem && <p className="text-xs font-bold text-berry-ink">{problem}</p>}
      <ConfirmButton
        className="btn btn-mango w-full"
        question={`${name}님에게 코인 ${formatNumber(n)}개를 보낼까요?`}
        confirmLabel="보내기"
        onConfirm={onSend}
        disabled={!n || !!problem || busy}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" strokeWidth={2.5} />} {n ? `🪙 ${formatCompact(n)} 보내기` : '보내기'}
      </ConfirmButton>
    </div>
  );
};

type GiftFilter = 'all' | 'in' | 'out';

/** Gifts sent and received (claimed), newest first, as a table with totals */
export const GiftTable: React.FC<{ received: GiftDoc[]; sent: GiftDoc[]; nameOf: (id: string) => string }> = ({ received, sent, nameOf }) => {
  const [filter, setFilter] = useState<GiftFilter>('all');
  const got = received.filter((g) => g.claimed);
  const rows = [...got.map((g) => ({ g, dir: 'in' as const })), ...sent.map((g) => ({ g, dir: 'out' as const }))]
    .filter((r) => filter === 'all' || r.dir === filter)
    .sort((a, b) => b.g.at - a.g.at);
  const sum = (list: GiftDoc[]) => list.reduce((n, g) => n + g.amount, 0);
  const FILTERS: [GiftFilter, string][] = [
    ['all', '전체'],
    ['in', '📥 받은'],
    ['out', '📤 보낸'],
  ];
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base">주고받은 기록</h3>
        <div role="group" aria-label="보기" className="flex gap-1">
          {FILTERS.map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={filter === v}
              onClick={() => setFilter(v)}
              className={`chip h-7 px-2.5 text-xs ${filter === v ? 'bg-grape text-white' : 'bg-surface-2 hover:bg-surface-3'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border-2 border-line bg-melon-soft px-3 py-2">
          <p className="text-[11px] font-bold text-ink-3">📥 받은 코인 · {got.length}번</p>
          <p className="font-display text-lg tabular-nums">🪙 {formatCompact(sum(got))}</p>
        </div>
        <div className="rounded-2xl border-2 border-line bg-mango-soft px-3 py-2">
          <p className="text-[11px] font-bold text-ink-3">📤 보낸 코인 · {sent.length}번</p>
          <p className="font-display text-lg tabular-nums">🪙 {formatCompact(sum(sent))}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm text-ink-3">아직 없어요.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border-2 border-line">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-surface-3 text-left text-[11px] text-ink-3">
              <tr>
                <th scope="col" className="w-16 px-2.5 py-1.5 font-bold">
                  구분
                </th>
                <th scope="col" className="px-2 py-1.5 font-bold">
                  친구
                </th>
                <th scope="col" className="w-24 px-2 py-1.5 text-right font-bold">
                  코인
                </th>
                <th scope="col" className="w-[4.5rem] px-2.5 py-1.5 text-right font-bold">
                  언제
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ g, dir }, i) => (
                <tr key={g.id} className={i % 2 ? 'bg-surface-2' : 'bg-surface'}>
                  <td className="px-2.5 py-2">
                    <span className={`chip h-6 px-1.5 text-[11px] ${dir === 'in' ? 'bg-melon-soft' : 'bg-mango-soft'}`}>{dir === 'in' ? '받음' : '보냄'}</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className="block truncate font-bold">{nameOf(dir === 'in' ? g.from : g.to)}</span>
                    {dir === 'out' && !g.claimed && <span className="block text-[10px] text-ink-3">아직 안 받았어요</span>}
                  </td>
                  <td className={`px-2 py-2 text-right font-display tabular-nums ${dir === 'in' ? 'text-melon-ink' : 'text-mango-ink'}`}>
                    {dir === 'in' ? '+' : '−'}
                    {formatCompact(g.amount)}
                  </td>
                  <td className="px-2.5 py-2 text-right text-[11px] text-ink-3">{g.at ? relativeTime(g.at) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

/** `seen`: friends only, when they were last here (left out for requests) */
const PlayerBadge: React.FC<{ p: PublicPlayer | null; fallback?: string; seen?: number | null }> = ({ p, fallback = '알 수 없는 플레이어', seen }) => {
  const t = titleDef(p?.title);
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="relative shrink-0">
        <Framed frame={p?.frame}>
          <AvatarFace emoji={p?.avatar ?? '❔'} photo={p?.photo} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-line bg-mango-soft text-xl" />
        </Framed>
        {isOnline(seen) && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-melon" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-bold">{p?.name ?? fallback}</span>
          {p?.verified && <VerifiedBadge />}
          {p && <span className="chip h-5 shrink-0 bg-surface px-1.5 text-[10px]">Lv.{p.level}</span>}
        </span>
        {t && <TitleTag title={t} variant="line" />}
        {seen !== undefined && <PresenceTag at={seen} className="mt-0.5" />}
      </span>
    </span>
  );
};

export const FriendsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  uid,
  isAdmin,
  myCode,
  balance,
  onLogin,
  onSendCoins,
  onClaimGifts,
  onViewPlayer,
  onChanged,
  onNotify,
}) => {
  const [tab, setTab] = useState<Tab>('friends');
  const [links, setLinks] = useState<FriendLink[] | null>(null);
  const [gifts, setGifts] = useState<{ inbox: GiftDoc[]; received: GiftDoc[]; sent: GiftDoc[]; sentToday: number } | null>(null);
  const [names, setNames] = useState<Record<string, PublicPlayer | null>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [found, setFound] = useState<PublicPlayer | null | 'none'>(null);
  const [sendTo, setSendTo] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);
  /** The add-a-friend box is open (always, while there are no friends) */
  const [adding, setAdding] = useState(false);
  const [friendQuery, setFriendQuery] = useState('');
  /** Whose ⋯ menu is open */
  const [manage, setManage] = useState<string | null>(null);

  const limits = isAdmin ? GIFT_LIMITS.admin : GIFT_LIMITS.player;

  const load = useCallback(async () => {
    if (!uid) return;
    setError('');
    try {
      const api = await friendsApi();
      const [l, g] = await Promise.all([api.loadFriends(uid), api.loadGifts(uid)]);
      setLinks(l);
      setGifts(g);
      // Names for gifts from players who are no longer friends
      const known: Record<string, PublicPlayer | null> = {};
      for (const link of l) known[link.otherUid] = link.other;
      const missing = [...new Set([...g.inbox, ...g.received, ...g.sent].flatMap((x) => [x.from, x.to]))].filter((id) => id !== uid && !(id in known));
      const extra = await Promise.all(missing.map((id) => api.getPlayer(id).catch(() => null)));
      missing.forEach((id, i) => (known[id] = extra[i]));
      setNames(known);
    } catch (err) {
      console.warn('Failed to load friends:', err);
      setError('친구 정보를 불러오지 못했어요. 잠시 뒤에 다시 열어 주세요.');
    }
  }, [uid]);

  useEffect(() => {
    if (!isOpen) return;
    setFound(null);
    setCodeInput('');
    setSendTo(null);
    setManage(null);
    setFriendQuery('');
    load();
  }, [isOpen, load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      console.warn(err);
      onNotify('⚠️', '잠시 뒤에 다시 해 주세요');
    } finally {
      setBusy('');
    }
  };

  if (!uid) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="친구" subtitle="친구 코드로 추가하고 코인을 선물해요" icon="👥" tone="soda" size="md">
        <div className="well space-y-3 p-5 text-center">
          <p className="text-4xl" aria-hidden="true">
            👥
          </p>
          <p className="font-bold">친구 기능은 Google 로그인을 하면 쓸 수 있어요</p>
          <button type="button" className="btn btn-soda w-full" onClick={onLogin}>
            로그인하기
          </button>
        </div>
      </Modal>
    );
  }

  // Friends online now first, then whoever was here most recently
  const friends = (links ?? []).filter((l) => l.status === 'accepted').sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));
  const incoming = (links ?? []).filter((l) => l.status === 'pending' && !l.fromMe);
  const outgoing = (links ?? []).filter((l) => l.status === 'pending' && l.fromMe);
  const inbox = gifts?.inbox ?? [];
  const nameOf = (id: string) => names[id]?.name ?? '알 수 없는 플레이어';
  const sentToday = gifts?.sentToday ?? 0;

  const find = async () => {
    const code = codeInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 8) {
      setFound('none');
      return;
    }
    setBusy('find');
    try {
      const api = await friendsApi();
      const p = await api.findByCode(code);
      setFound(p ?? 'none');
    } catch {
      setFound('none');
    } finally {
      setBusy('');
    }
  };

  const request = (other: PublicPlayer) =>
    run('request', async () => {
      const api = await friendsApi();
      const r = await api.requestFriend(uid, other.uid);
      onNotify(
        r === 'exists' ? 'ℹ️' : '👥',
        r === 'sent' ? `${other.name}님에게 친구 요청을 보냈어요` : r === 'accepted' ? `${other.name}님과 친구가 됐어요` : '이미 친구이거나 요청한 사이예요'
      );
      setFound(null);
      setCodeInput('');
    });

  const send = async (to: string) => {
    const n = Number(amount.replace(/[^0-9]/g, ''));
    if (!Number.isSafeInteger(n) || n < 1 || n > limits.max) {
      onNotify('⚠️', `1 ~ ${formatNumber(limits.max)}코인 사이로 보내 주세요`);
      return;
    }
    setBusy('send');
    const r = await onSendCoins(to, n);
    setBusy('');
    if (r === 'ok') {
      onNotify('🪙', `${nameOf(to)}님에게 코인 ${formatNumber(n)}개를 보냈어요`);
      setSendTo(null);
      setAmount('');
      await load();
    } else {
      onNotify('⚠️', r === 'limit' ? `오늘은 선물을 ${limits.perDay}번까지 보낼 수 있어요` : r === 'coins' ? '코인이 모자라요' : '보내지 못했어요. 잠시 뒤에 다시 해 주세요');
    }
  };

  const claim = async (ids: string[]) => {
    setBusy('claim');
    try {
      const coins = await onClaimGifts(ids);
      if (coins > 0) onNotify('🎁', `코인 ${formatNumber(coins)}개를 받았어요`);
      await load();
      onChanged();
    } catch (err) {
      console.warn(err);
      onNotify('⚠️', '받지 못했어요. 잠시 뒤에 다시 해 주세요');
    } finally {
      setBusy('');
    }
  };

  const shownCode = myCode ? `${myCode.slice(0, 4)}-${myCode.slice(4)}` : '';
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const shareCode = () =>
    navigator.share?.({ title: 'FRUIT ARCADE 친구 코드', text: `FRUIT ARCADE에서 친구해요! 내 친구 코드: ${shownCode}`, url: window.location.origin + window.location.pathname }).catch(() => {});

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const tabs: [Tab, string, number][] = [
    ['friends', '👥 친구', friends.length],
    ['requests', '📬 요청', incoming.length],
    ['gifts', '🎁 선물함', inbox.length],
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="친구" subtitle="친구 코드로 추가하고 코인을 선물해요" icon="👥" tone="soda" size="md">
      <div className="well mb-3 flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-ink-3">내 친구 코드 · 친구에게 알려 주세요</p>
          <p className="font-display text-2xl tracking-wider tabular-nums">{shownCode || '만드는 중…'}</p>
        </div>
        <button type="button" className="btn btn-sm shrink-0" onClick={copyCode} disabled={!myCode}>
          {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Copy className="h-4 w-4" strokeWidth={2.5} />} {copied ? '복사됨' : '복사'}
        </button>
        {canShare && (
          <button type="button" className="btn btn-icon btn-sm shrink-0" onClick={shareCode} disabled={!myCode} aria-label="친구 코드 공유">
            <Share2 className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <div role="tablist" aria-label="친구 메뉴" className="mb-3 grid grid-cols-3 gap-1.5">
        {tabs.map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`relative rounded-2xl border-2 border-line px-2 py-2 text-sm font-bold transition-all ${
              tab === id ? '-translate-y-0.5 bg-soda text-on-bright shadow-hard-sm' : 'bg-surface-2 hover:bg-surface-3'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`ml-1 rounded-full px-1.5 text-xs ${id !== 'friends' ? 'bg-berry text-white' : 'bg-surface text-ink'}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 rounded-xl border-2 border-line bg-berry-soft p-3 text-sm font-bold">{error}</p>}
      {!links && !error && (
        <p className="flex items-center justify-center gap-2 py-8 text-sm text-ink-3">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
        </p>
      )}

      {links && tab === 'friends' && (
        <div className="space-y-3">
          {/* Add a friend by code: open while there are no friends, folded away after that */}
          {adding || friends.length === 0 ? (
            <section className="space-y-2 rounded-2xl border-2 border-line bg-soda-soft p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">➕ 친구 추가</p>
                {friends.length > 0 && (
                  <button type="button" className="btn btn-icon btn-sm" onClick={() => setAdding(false)} aria-label="친구 추가 닫기">
                    <X className="h-4 w-4" strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  find();
                }}
              >
                <input
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                    setFound(null);
                  }}
                  placeholder="친구 코드 8자리 (예: ABCD-2345)"
                  aria-label="친구 코드"
                  maxLength={12}
                  className="min-w-0 flex-1 rounded-2xl border-2 border-line bg-surface px-3 py-2 font-display uppercase tracking-wider outline-none focus:border-soda"
                />
                <button type="submit" className="btn btn-sm btn-soda shrink-0" disabled={busy === 'find' || !codeInput.trim()}>
                  {busy === 'find' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" strokeWidth={2.5} />} 찾기
                </button>
              </form>
              {found === 'none' && <p className="text-xs font-bold text-berry-ink">그 코드의 플레이어가 없어요. 8자리를 다시 확인해 주세요.</p>}
              {found && found !== 'none' && (
                <div className="flex items-center gap-2 rounded-2xl border-2 border-line bg-soda-soft p-2.5">
                  <PlayerBadge p={found} />
                  {found.uid === uid ? (
                    <span className="chip h-8 shrink-0 bg-surface text-xs">나예요</span>
                  ) : (
                    <button type="button" className="btn btn-sm btn-soda shrink-0" disabled={busy === 'request'} onClick={() => request(found)}>
                      <UserPlus className="h-4 w-4" strokeWidth={2.5} /> 친구 요청
                    </button>
                  )}
                </div>
              )}

              <p className="text-[11px] text-ink-3">랭킹에서 이름을 눌러도 친구 요청을 보낼 수 있어요.</p>
            </section>
          ) : (
            <button type="button" className="btn btn-sm w-full" onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" strokeWidth={2.5} /> 코드로 친구 추가
            </button>
          )}

          {friends.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 p-4 text-center text-sm text-ink-3">아직 친구가 없어요. 친구 코드를 주고받거나 랭킹에서 이름을 눌러 친구를 추가해 보세요.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip h-7 bg-melon-soft px-2.5 text-xs">🟢 지금 접속 {friends.filter((l) => isOnline(l.lastSeen)).length}명</span>
                <span className="chip h-7 bg-surface-2 px-2.5 text-xs">👥 친구 {friends.length}명</span>
              </div>
              {friends.length > 5 && (
                <label className="relative block">
                  <span className="sr-only">친구 찾기</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" strokeWidth={2.5} />
                  <input
                    value={friendQuery}
                    onChange={(e) => setFriendQuery(e.target.value)}
                    placeholder="친구 이름으로 찾기"
                    className="h-10 w-full select-text rounded-xl border-2 border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-soda"
                  />
                </label>
              )}
              <p className="text-xs text-ink-3">
                {isAdmin
                  ? '🛡️ 운영진은 횟수 · 금액 제한 없이 코인을 선물할 수 있어요'
                  : `🪙 오늘 보낸 선물 ${sentToday}/${limits.perDay}번 · 한 번에 1~${limits.max}코인 · 내 코인 ${formatCompact(balance)}`}
              </p>
              <ul className="space-y-2">
                {friends
                  .filter((l) => !friendQuery.trim() || (l.other?.name ?? '').toLowerCase().includes(friendQuery.trim().toLowerCase()))
                  .map((l) => {
                    const online = isOnline(l.lastSeen);
                    const bests = GAME_ORDER.filter((g) => (l.other?.best[g] ?? 0) > 0).slice(0, 3);
                    return (
                      <li key={l.pair} className={`rounded-2xl border-2 border-line p-2.5 ${online ? 'bg-melon-soft' : 'bg-surface-2'}`}>
                        <div className="flex items-center gap-2">
                          <button type="button" className="flex min-w-0 flex-1 text-left" onClick={() => onViewPlayer(l.otherUid)} aria-label={`${l.other?.name ?? '친구'} 프로필`}>
                            <PlayerBadge p={l.other} seen={l.lastSeen ?? null} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-mango shrink-0"
                            onClick={() => {
                              setSendTo(sendTo === l.otherUid ? null : l.otherUid);
                              setAmount('');
                            }}
                            aria-expanded={sendTo === l.otherUid}
                          >
                            🪙 선물
                          </button>
                          <button
                            type="button"
                            className="btn btn-icon btn-sm shrink-0"
                            onClick={() => setManage(manage === l.pair ? null : l.pair)}
                            aria-expanded={manage === l.pair}
                            aria-label={`${l.other?.name ?? '친구'} 더 보기`}
                          >
                            <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
                          </button>
                        </div>
                        {bests.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1 pl-[3.25rem]" aria-label="최고 기록">
                            {bests.map((g) => (
                              <span key={g} className="chip h-6 bg-surface px-2 text-[11px] tabular-nums">
                                <Emoji e={GAMES[g].emoji} /> {formatCompact(l.other!.best[g]!)}
                              </span>
                            ))}
                          </div>
                        )}
                        {manage === l.pair && (
                          <div className="mt-2 grid grid-cols-2 gap-2 border-t-2 border-dashed border-line pt-2">
                            <button type="button" className="btn btn-sm w-full" onClick={() => onViewPlayer(l.otherUid)}>
                              <UserRound className="h-4 w-4" strokeWidth={2.5} /> 프로필 보기
                            </button>
                            <ConfirmButton
                              className="btn btn-sm w-full"
                              question={`${l.other?.name ?? '이 친구'}${josa(l.other?.name ?? '친구', '과', '와')} 친구를 끊을까요?`}
                              confirmLabel="끊기"
                              onConfirm={() =>
                                run('remove', async () => {
                                  const api = await friendsApi();
                                  await api.removeFriend(l.pair);
                                })
                              }
                              panelClassName="col-span-2"
                            >
                              <X className="h-4 w-4" strokeWidth={2.5} /> 친구 끊기
                            </ConfirmButton>
                          </div>
                        )}
                        {sendTo === l.otherUid && (
                          <GiftForm
                            name={l.other?.name ?? '친구'}
                            isAdmin={isAdmin}
                            balance={balance}
                            sentToday={sentToday}
                            busy={busy === 'send'}
                            amount={amount}
                            onAmount={setAmount}
                            onSend={() => send(l.otherUid)}
                          />
                        )}
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </div>
      )}

      {links && tab === 'requests' && (
        <div className="space-y-4">
          <section>
            <h3 className="mb-2 font-display text-base">받은 요청</h3>
            {incoming.length === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm text-ink-3">받은 친구 요청이 없어요.</p>
            ) : (
              <ul className="space-y-2">
                {incoming.map((l) => (
                  <li key={l.pair} className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface-2 p-2.5">
                    <PlayerBadge p={l.other} />
                    <button
                      type="button"
                      className="btn btn-sm btn-melon shrink-0"
                      disabled={!!busy}
                      onClick={() =>
                        run('accept', async () => {
                          const api = await friendsApi();
                          await api.acceptFriend(l.pair);
                          onNotify('👥', `${l.other?.name ?? '새 친구'}님과 친구가 됐어요`);
                        })
                      }
                    >
                      수락
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm shrink-0"
                      disabled={!!busy}
                      onClick={() =>
                        run('decline', async () => {
                          const api = await friendsApi();
                          await api.removeFriend(l.pair);
                        })
                      }
                    >
                      거절
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-2 font-display text-base">보낸 요청</h3>
            {outgoing.length === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm text-ink-3">기다리는 요청이 없어요.</p>
            ) : (
              <ul className="space-y-2">
                {outgoing.map((l) => (
                  <li key={l.pair} className="flex items-center gap-2 rounded-2xl border-2 border-line bg-surface-2 p-2.5">
                    <PlayerBadge p={l.other} />
                    <span className="chip h-8 shrink-0 bg-surface text-xs">기다리는 중</span>
                    <button
                      type="button"
                      className="btn btn-sm shrink-0"
                      disabled={!!busy}
                      onClick={() =>
                        run('cancel', async () => {
                          const api = await friendsApi();
                          await api.removeFriend(l.pair);
                        })
                      }
                    >
                      취소
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {links && tab === 'gifts' && gifts && (
        <div className="space-y-4">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-display text-base">받은 선물</h3>
              {inbox.length > 1 && (
                <button type="button" className="btn btn-sm btn-mango" disabled={busy === 'claim'} onClick={() => claim(inbox.map((g) => g.id))}>
                  모두 받기
                </button>
              )}
            </div>
            {inbox.length === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm text-ink-3">새 선물이 없어요.</p>
            ) : (
              <ul className="space-y-2">
                {inbox.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 rounded-2xl border-2 border-line bg-mango-soft p-2.5">
                    <span className="text-2xl" aria-hidden="true">
                      🎁
                    </span>
                    <p className="min-w-0 flex-1 text-sm">
                      <b>{nameOf(g.from)}</b>님이 <b className="tabular-nums">🪙 {formatCompact(g.amount)}</b>
                      <span className="block text-[11px] text-ink-3">{g.at ? relativeTime(g.at) : ''}</span>
                    </p>
                    <button type="button" className="btn btn-sm btn-mango shrink-0" disabled={busy === 'claim'} onClick={() => claim([g.id])}>
                      받기
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <GiftTable received={gifts.received} sent={gifts.sent} nameOf={nameOf} />
        </div>
      )}
    </Modal>
  );
};
