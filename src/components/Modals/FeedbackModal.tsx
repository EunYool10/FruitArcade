import React, { useEffect, useId, useState } from 'react';
import { Loader2, LogIn, Send } from 'lucide-react';
import type { FeedbackKind } from '../../utils/communityService';
import { Modal } from '../ui/Modal';
import { Segmented } from '../ui/Segmented';

const communityApi = () => import('../../utils/communityService');

const MAX = 1000;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uid: string | null;
  /** How the player shows up to the admins (nickname, never the Google name) */
  name: string;
  onLogin: () => void;
  onSent: () => void;
}

const PLACEHOLDER: Record<FeedbackKind, string> = {
  bug: '어떤 게임에서 무엇을 했을 때 문제가 생겼는지 알려 주세요.',
  idea: '있었으면 하는 기능이나 바뀌었으면 하는 점을 적어 주세요.',
  other: '하고 싶은 말을 자유롭게 적어 주세요.',
};

export const FeedbackModal: React.FC<Props> = ({ isOpen, onClose, uid, name, onLogin, onSent }) => {
  const fieldId = useId();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

  const send = async () => {
    if (!uid || !message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const result = await (await communityApi()).sendFeedback(uid, name, kind, message);
      if (result === 'too-soon') {
        setError('조금 전에 보냈어요. 5분 뒤에 다시 보내 주세요.');
        return;
      }
      setMessage('');
      onSent();
      onClose();
    } catch (err) {
      console.warn('Failed to send feedback:', err);
      setError('보내지 못했어요. 인터넷 연결을 확인해 주세요.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={sending ? undefined : onClose}
      title="의견 · 버그 보내기"
      subtitle="보내 주신 내용은 운영자가 직접 읽어요"
      icon="💌"
      tone="soda"
      footer={
        uid ? (
          <button type="button" className="btn btn-soda w-full" onClick={send} disabled={sending || !message.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2.5} />}
            보내기
          </button>
        ) : (
          <button type="button" className="btn btn-soda w-full" onClick={onLogin}>
            <LogIn className="h-4 w-4" strokeWidth={2.5} /> 로그인하고 보내기
          </button>
        )
      }
    >
      {!uid && (
        <p className="mb-3 rounded-2xl border-2 border-line bg-soda-soft px-3 py-2 text-sm font-bold">
          의견은 Google 로그인한 뒤에 보낼 수 있어요.
        </p>
      )}
      <Segmented<FeedbackKind>
        ariaLabel="종류"
        columns={3}
        value={kind}
        onChange={setKind}
        options={[
          { value: 'bug', label: '🐞 버그' },
          { value: 'idea', label: '💡 아이디어' },
          { value: 'other', label: '💬 기타' },
        ]}
      />
      <label htmlFor={fieldId} className="mb-1 mt-4 block text-sm font-bold">
        내용
      </label>
      <textarea
        id={fieldId}
        value={message}
        maxLength={MAX}
        rows={6}
        disabled={!uid}
        placeholder={PLACEHOLDER[kind]}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full resize-none select-text rounded-2xl border-2 border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-soda disabled:opacity-60"
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-ink-3">
        <span>앱 버전과 기기 종류가 함께 전송돼요</span>
        <span className="tabular-nums">
          {message.length} / {MAX}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-2xl border-2 border-line bg-berry-soft px-3 py-2 text-sm font-bold">
          {error}
        </p>
      )}
    </Modal>
  );
};
