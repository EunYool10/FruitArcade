import React, { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { LookChange, UserRow } from '../../utils/adminService';
import { AVATARS, NICKNAME_MAX, cleanNickname, isReservedNickname } from '../../utils/profile';
import { hasBadWords } from '../../utils/badWords';
import { PRISM_FRAME } from '../../utils/shop';
import { Framed } from '../ui/Avatar';
import { Emoji } from '../ui/Emoji';
import { ConfirmButton } from '../ui/ConfirmButton';

const adminApi = () => import('../../utils/adminService');

interface Props {
  u: UserRow;
  /** First on the admin list: may give and take back the 프리즘 테두리 */
  isGameOwner: boolean;
  busy: boolean;
  onSave: (c: LookChange) => void;
  onPrism: (give: boolean) => void;
}

const pick = (on: boolean) => `chip h-8 shrink-0 px-3 ${on ? 'bg-grape text-white' : 'bg-surface-2 hover:bg-surface-3'}`;

/** 관리자 → 유저 → 프로필 바꾸기: a player's nickname, avatar, title and frame */
export const AdminLookEditor: React.FC<Props> = ({ u, isGameOwner, busy, onSave, onPrism }) => {
  const [name, setName] = useState(u.rawName);
  const [avatar, setAvatar] = useState('');
  const [clearTitle, setClearTitle] = useState(false);
  const [frame, setFrame] = useState<string | null>(null);
  const [error, setError] = useState('');
  /** null while loading */
  const [hasPrism, setHasPrism] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    adminApi()
      .then((api) => api.ownerGiftsOf(u.uid))
      .then((items) => alive && setHasPrism(items.includes(PRISM_FRAME)))
      .catch(() => alive && setHasPrism(false));
    return () => {
      alive = false;
    };
  }, [u.uid, u.frame]);

  const save = () => {
    const c: LookChange = {};
    const nick = cleanNickname(name);
    if (nick !== u.rawName) {
      if (nick && !u.verified && isReservedNickname(nick)) return setError('운영진처럼 보이는 이름은 쓸 수 없어요.');
      if (hasBadWords(nick)) return setError('나쁜 말이 들어간 이름이에요.');
      c.nickname = nick;
    }
    if (avatar) c.avatar = avatar;
    if (clearTitle) c.clearTitle = true;
    if (frame !== null) c.frame = frame;
    if (!Object.keys(c).length) return setError('바꿀 것을 골라 주세요.');
    setError('');
    onSave(c);
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-grape bg-grape-soft p-3">
      <p className="text-sm font-bold">✏️ 프로필 바꾸기</p>

      <label className="block space-y-1">
        <span className="text-xs font-bold text-ink-2">닉네임 (비우면 기본 이름 · 과일러 0000)</span>
        <input
          value={name}
          maxLength={NICKNAME_MAX + 4}
          onChange={(e) => setName(e.target.value)}
          className="h-10 w-full select-text rounded-xl border-2 border-line bg-surface px-3 text-sm outline-none focus:border-grape"
        />
      </label>

      <div className="space-y-1">
        <p className="text-xs font-bold text-ink-2">아바타 (과일을 고르면 Google 사진도 내려가요)</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={pick(!avatar)} onClick={() => setAvatar('')}>
            그대로
          </button>
          {AVATARS.map((e) => (
            <button key={e} type="button" className={`${pick(avatar === e)} w-9 justify-center px-0 text-lg`} onClick={() => setAvatar(e)} aria-label={`${e} 아바타`}>
              <Emoji e={e} />
            </button>
          ))}
        </div>
      </div>

      {u.title && (
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={clearTitle} onChange={(e) => setClearTitle(e.target.checked)} className="h-4 w-4 accent-[var(--grape)]" />
          칭호 떼기
        </label>
      )}

      <div className="space-y-1">
        <p className="text-xs font-bold text-ink-2">테두리</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={pick(frame === null)} onClick={() => setFrame(null)}>
            그대로
          </button>
          {u.frame && (
            <button type="button" className={pick(frame === '')} onClick={() => setFrame('')}>
              떼기
            </button>
          )}
          {hasPrism && u.frame !== PRISM_FRAME && (
            <button type="button" className={pick(frame === PRISM_FRAME)} onClick={() => setFrame(PRISM_FRAME)}>
              🌈 프리즘 끼우기
            </button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-berry-soft px-3 py-2 text-xs font-bold">{error}</p>}
      <button type="button" className="btn btn-sm btn-grape w-full" disabled={busy} onClick={save}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2.5} />} 바꾸기
      </button>
      <p className="text-[11px] text-ink-3">계정 · 프로필 카드 · 오늘 · 이번 주 · 전체 랭킹이 바뀌어요. 그 사람 기기에는 다음에 앱을 열 때 적용돼요.</p>

      {isGameOwner && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface p-2.5">
          <Framed frame={PRISM_FRAME}>
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-line bg-mango-soft text-xl" aria-hidden="true">
              <Emoji e={u.avatar} />
            </span>
          </Framed>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">👑 소유자 선물 · 프리즘 테두리</p>
            <p className="text-[11px] text-ink-3">
              {hasPrism === null ? '확인하는 중…' : hasPrism ? '이미 받았어요. 회수하면 끼고 있던 테두리도 내려가요.' : '소유자만 줄 수 있어요. 주면 바로 끼워져요.'}
            </p>
          </div>
          {hasPrism === null ? null : hasPrism ? (
            <ConfirmButton className="btn btn-sm shrink-0" question={`${u.name}님의 프리즘 테두리를 회수할까요?`} confirmLabel="회수" onConfirm={() => onPrism(false)}>
              회수
            </ConfirmButton>
          ) : (
            <button type="button" className="btn btn-sm btn-mango shrink-0" disabled={busy} onClick={() => onPrism(true)}>
              🌈 주기
            </button>
          )}
        </div>
      )}
    </div>
  );
};
