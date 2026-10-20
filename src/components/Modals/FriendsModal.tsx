import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Gift, Loader2, Search, UserPlus, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ConfirmButton } from '../ui/ConfirmButton';
import { AvatarFace, Framed } from '../ui/Avatar';
import { TitleTag } from '../ui/TitleTag';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { PresenceTag } from '../ui/Presence';
import { titleDef } from '../../utils/titles';
import { formatCompact, formatNumber, josa, relativeTime } from '../../utils/format';
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
const ADMIN_AMOUNTS = [1_000, 1_000_000, 100_000_000, COIN_MAX];

/** `seen`: friends only, when they were last here (left out for requests) */
const PlayerBadge: React.FC<{ p: PublicPlayer | null; fallback?: string; seen?: number | null }> = ({ p, fallback = '알 수 없는 플레이어', seen }) => {
  const t = titleDef(p?.title);
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <Framed frame={p?.frame}>
        <AvatarFace emoji={p?.avatar ?? '❔'} photo={p?.photo} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-line bg-mango-soft text-xl" />
      </Framed>
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
          <p className="font-display text-2xl tracking-wider tabular-nums">{myCode ? `${myCode.slice(0, 4)}-${myCode.slice(4)}` : '만드는 중…'}</p>
        </div>
        <button type="button" className="btn btn-sm shrink-0" onClick={copyCode} disabled={!myCode}>
          {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Copy className="h-4 w-4" strokeWidth={2.5} />} {copied ? '복사됨' : '복사'}
        </button>
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

          {friends.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 p-4 text-center text-sm text-ink-3">아직 친구가 없어요. 친구 코드를 주고받거나 랭킹에서 이름을 눌러 친구를 추가해 보세요.</p>
          ) : (
            <>
              <p className="text-xs text-ink-3">
                🪙 오늘 보낸 선물 {sentToday}/{limits.perDay}번 · 한 번에 {isAdmin ? `최대 ${formatCompact(limits.max)}` : `1~${limits.max}`}코인
                {Number.isFinite(balance) && ` · 내 코인 ${formatCompact(balance)}`}
              </p>
              <ul className="space-y-2">
                {friends.map((l) => (
                  <li key={l.pair} className="rounded-2xl border-2 border-line bg-surface-2 p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
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
                      <ConfirmButton
                        className="btn btn-icon btn-sm shrink-0"
                        question={`${l.other?.name ?? '이 친구'}${josa(l.other?.name ?? '친구', '과', '와')} 친구를 끊을까요?`}
                        confirmLabel="끊기"
                        onConfirm={() =>
                          run('remove', async () => {
                            const api = await friendsApi();
                            await api.removeFriend(l.pair);
                          })
                        }
                        ariaLabel="친구 끊기"
                        panelClassName="basis-full"
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                      </ConfirmButton>
                    </div>
                    {sendTo === l.otherUid && (
                      <div className="mt-2.5 space-y-2 border-t-2 border-dashed border-line pt-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {(isAdmin ? ADMIN_AMOUNTS : PLAYER_AMOUNTS).map((a) => (
                            <button
                              key={a}
                              type="button"
                              className={`chip h-8 px-2.5 text-xs ${amount === String(a) ? 'bg-mango text-on-bright shadow-hard-sm' : 'bg-surface hover:bg-surface-3'}`}
                              onClick={() => setAmount(String(a))}
                            >
                              🪙 {a === COIN_MAX ? '최대' : formatCompact(a)}
                            </button>
                          ))}
                        </div>
                        <div className="space-y-2">
                          <input
                            value={amount ? formatNumber(Number(amount.replace(/[^0-9]/g, '')) || 0) : ''}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, String(limits.max).length))}
                            inputMode="numeric"
                            placeholder={`보낼 코인 (최대 ${formatCompact(limits.max)})`}
                            aria-label="보낼 코인"
                            className="w-full rounded-2xl border-2 border-line bg-surface px-3 py-2 text-sm tabular-nums outline-none focus:border-mango"
                          />
                          <ConfirmButton
                            className="btn btn-sm btn-mango w-full"
                            question={`${l.other?.name ?? '친구'}님에게 코인 ${formatNumber(Number(amount) || 0)}개를 보낼까요?`}
                            confirmLabel="보내기"
                            onConfirm={() => send(l.otherUid)}
                            disabled={!amount || busy === 'send' || sentToday >= limits.perDay}
                          >
                            {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" strokeWidth={2.5} />} 보내기
                          </ConfirmButton>
                        </div>
                        {sentToday >= limits.perDay && <p className="text-xs font-bold text-berry-ink">오늘 보낼 수 있는 선물을 다 보냈어요. 내일 다시 보낼 수 있어요.</p>}
                      </div>
                    )}
                  </li>
                ))}
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
          <section>
            <h3 className="mb-2 font-display text-base">최근 주고받은 선물</h3>
            {[...gifts.received.filter((g) => g.claimed), ...gifts.sent].length === 0 ? (
              <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm text-ink-3">아직 없어요.</p>
            ) : (
              <ul className="space-y-1.5">
                {[...gifts.received.filter((g) => g.claimed), ...gifts.sent]
                  .sort((a, b) => b.at - a.at)
                  .slice(0, 20)
                  .map((g) => (
                    <li key={g.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <span aria-hidden="true">{g.from === uid ? '📤' : '📥'}</span>
                      <span className="min-w-0 flex-1 truncate">
                        {g.from === uid ? `${nameOf(g.to)}님에게` : `${nameOf(g.from)}님에게서`}
                      </span>
                      <span className="shrink-0 font-bold tabular-nums">🪙 {formatCompact(g.amount)}</span>
                      <span className="shrink-0 text-[11px] text-ink-3">{g.at ? relativeTime(g.at) : ''}</span>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
};
