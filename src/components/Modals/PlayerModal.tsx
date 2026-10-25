import React, { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { AvatarFace, Framed } from '../ui/Avatar';
import { TitleTag } from '../ui/TitleTag';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { GAMES, GAME_ORDER, TONE } from '../../constants';
import { titleDef } from '../../utils/titles';
import { formatNumber } from '../../utils/format';
import type { PublicPlayer } from '../../utils/friendsService';
import { Emoji } from '../ui/Emoji';
import { PresenceTag } from '../ui/Presence';

const friendsApi = () => import('../../utils/friendsService');

type Status = 'none' | 'sent' | 'received' | 'friends';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Me (null for guests) */
  viewerUid: string | null;
  /** Whose card to show */
  targetUid: string | null;
  onNotify: (icon: string, title: string) => void;
  /** A request was sent or accepted */
  onChanged: () => void;
  onOpenFriends: () => void;
}

/** Another player's public card, with a friend request button */
export const PlayerModal: React.FC<Props> = ({ isOpen, onClose, viewerUid, targetUid, onNotify, onChanged, onOpenFriends }) => {
  const [player, setPlayer] = useState<PublicPlayer | null | 'missing'>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  /** Friends (and me): when they were last here; undefined while unknown or not friends */
  const [seen, setSeen] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!isOpen || !targetUid || !viewerUid) return;
    let alive = true;
    setPlayer(null);
    setStatus(null);
    setSeen(undefined);
    friendsApi()
      .then(async (api) => {
        const [p, s] = await Promise.all([api.getPlayer(targetUid), targetUid === viewerUid ? Promise.resolve(null) : api.friendStatus(viewerUid, targetUid)]);
        if (!alive) return;
        setPlayer(p ?? 'missing');
        setStatus(s);
        // Only friends (and I) may see when someone was last here
        if (s === 'friends' || targetUid === viewerUid) {
          const at = await api.lastSeen(targetUid).catch(() => null);
          if (alive) setSeen(at);
        }
      })
      .catch(() => alive && setPlayer('missing'));
    return () => {
      alive = false;
    };
  }, [isOpen, targetUid, viewerUid]);

  const act = async (kind: 'request' | 'accept') => {
    if (!viewerUid || !targetUid || !player || player === 'missing') return;
    setBusy(true);
    try {
      const api = await friendsApi();
      if (kind === 'request') {
        const r = await api.requestFriend(viewerUid, targetUid);
        setStatus(r === 'accepted' ? 'friends' : 'sent');
        onNotify('👥', r === 'accepted' ? `${player.name}님과 친구가 됐어요` : `${player.name}님에게 친구 요청을 보냈어요`);
      } else {
        await api.acceptFriend(api.pairId(viewerUid, targetUid));
        setStatus('friends');
        onNotify('👥', `${player.name}님과 친구가 됐어요`);
      }
      onChanged();
    } catch {
      onNotify('⚠️', '잠시 뒤에 다시 해 주세요');
    } finally {
      setBusy(false);
    }
  };

  const p = player && player !== 'missing' ? player : null;
  const t = titleDef(p?.title);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="플레이어 프로필" subtitle="레벨 · 칭호 · 최고 기록" icon="👤" tone="soda" size="sm">
      {!viewerUid ? (
        <p className="well p-4 text-center text-sm">로그인하면 다른 플레이어의 프로필을 보고 친구를 추가할 수 있어요.</p>
      ) : player === null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-sm text-ink-3">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
        </p>
      ) : !p ? (
        <p className="well p-4 text-center text-sm">아직 프로필을 만들지 않은 플레이어예요. 다음에 접속하면 생겨요.</p>
      ) : (
        <div className="space-y-3">
          <div className="well flex items-center gap-3 p-4">
            <Framed frame={p.frame}>
              <AvatarFace emoji={p.avatar} photo={p.photo} className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-line bg-mango-soft text-3xl" />
            </Framed>
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-1.5 font-display text-xl">
                <span className="truncate">{p.name}</span>
                {p.verified && <VerifiedBadge className="h-5 w-5" />}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="chip bg-mango-soft">Lv.{p.level}</span>
                <span className="chip bg-surface">🏆 업적 {p.achievements}개</span>
                {t && <TitleTag title={t} />}
              </div>
              {seen !== undefined && <PresenceTag at={seen} className="mt-1.5 text-xs" />}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {GAME_ORDER.map((g) => (
              <div key={g} className={`min-w-0 rounded-xl border-2 border-line px-1 py-2 text-center ${TONE[GAMES[g].tone].soft}`}>
                <p className="text-lg" aria-hidden="true">
                  <Emoji e={GAMES[g].emoji} />
                </p>
                <p className="truncate text-[11px] font-bold text-ink-2">{GAMES[g].short}</p>
                <p className="truncate font-display text-sm tabular-nums">{p.best[g] ? formatNumber(p.best[g]!) : '–'}</p>
              </div>
            ))}
          </div>

          {targetUid === viewerUid ? (
            <p className="text-center text-xs font-bold text-ink-3">내 프로필이에요. 다른 사람에게 이렇게 보여요.</p>
          ) : status === 'none' ? (
            <button type="button" className="btn btn-soda w-full" disabled={busy} onClick={() => act('request')}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" strokeWidth={2.5} />} 친구 요청
            </button>
          ) : status === 'received' ? (
            <button type="button" className="btn btn-melon w-full" disabled={busy} onClick={() => act('accept')}>
              친구 요청 수락
            </button>
          ) : status === 'sent' ? (
            <p className="rounded-2xl bg-surface-2 p-3 text-center text-sm font-bold">친구 요청을 보냈어요. 상대가 수락하면 친구가 돼요.</p>
          ) : status === 'friends' ? (
            <button type="button" className="btn w-full" onClick={onOpenFriends}>
              👥 친구예요 · 친구 창 열기
            </button>
          ) : null}
        </div>
      )}
    </Modal>
  );
};
