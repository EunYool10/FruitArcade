import React, { useEffect, useState } from 'react';
import { Loader2, UserPlus, X } from 'lucide-react';
import { ConfirmButton } from '../ui/ConfirmButton';

const adminApi = () => import('../../utils/adminService');

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * 설정 → 운영진: who the admins are, and adding one by Google email (they become an admin the next
 * time they sign in with it). Only the owner (first on the list) can take someone off;
 * firestore.rules enforces the same.
 */
export const AdminRoster: React.FC<{ isOpen: boolean; myEmail: string }> = ({ isOpen, myEmail }) => {
  const [emails, setEmails] = useState<string[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  const load = () =>
    adminApi()
      .then((api) => api.listAdmins())
      .then(setEmails)
      .catch(() => setNotice({ text: '운영진 목록을 불러오지 못했어요.', ok: false }));

  useEffect(() => {
    if (!isOpen) return;
    setNotice(null);
    load();
  }, [isOpen]);

  const me = myEmail.toLowerCase();
  const owner = emails?.[0] ?? '';
  const isOwner = !!me && me === owner;

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice({ text: done, ok: true });
      await load();
    } catch {
      setNotice({ text: '바꾸지 못했어요. 권한과 인터넷 연결을 확인해 주세요.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const email = draft.trim().toLowerCase();
    if (!EMAIL.test(email)) return setNotice({ text: '이메일 주소를 확인해 주세요.', ok: false });
    if (emails?.includes(email)) return setNotice({ text: '이미 운영진이에요.', ok: false });
    if ((emails?.length ?? 0) >= 30) return setNotice({ text: '운영진은 30명까지예요.', ok: false });
    run(async () => (await adminApi()).addAdmin(email), `${email}을(를) 운영진으로 등록했어요. 그 Google 계정으로 로그인하면 운영진이 돼요.`).then(() => setDraft(''));
  };

  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-sm font-bold">👥 운영진 관리</p>
        <p className="text-xs text-ink-3">Google 계정 이메일을 넣으면, 그 계정으로 로그인할 때 운영진이 돼요. 빼는 건 소유자만 할 수 있어요.</p>
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input
          type="email"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="name@gmail.com"
          aria-label="운영진으로 등록할 이메일"
          className="h-10 min-w-0 flex-1 select-text rounded-xl border-2 border-line bg-surface px-3 text-sm outline-none focus:border-grape"
        />
        <button type="submit" className="btn btn-sm btn-grape h-10 shrink-0" disabled={busy || !draft.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" strokeWidth={2.5} />} 등록
        </button>
      </form>
      {notice && <p className={`rounded-xl px-3 py-2 text-xs font-bold ${notice.ok ? 'bg-melon-soft' : 'bg-berry-soft'}`}>{notice.text}</p>}
      {!emails ? (
        <p className="flex items-center gap-2 text-xs text-ink-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> 불러오는 중…
        </p>
      ) : (
        <ul className="space-y-1.5" aria-label={`운영진 ${emails.length}명`}>
          {emails.map((email, i) => (
            <li key={email} className="flex items-center gap-2 rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-bold">{email}</span>
              {i === 0 && <span className="chip h-5 shrink-0 bg-mango px-1.5 text-[10px] text-on-bright">소유자</span>}
              {email === me && <span className="shrink-0 text-[11px] text-ink-3">(나)</span>}
              {isOwner && i > 0 && (
                <ConfirmButton
                  className="btn btn-sm btn-icon h-7 w-7 shrink-0"
                  question={`${email}을(를) 운영진에서 뺄까요?`}
                  confirmLabel="빼기"
                  ariaLabel={`${email} 운영진에서 빼기`}
                  onConfirm={() => run(async () => (await adminApi()).removeAdmin(email), `${email}을(를) 운영진에서 뺐어요.`)}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
