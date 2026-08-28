import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Cloud,
  Trophy,
  LogOut,
  User as UserIcon,
  Loader2,
  AlertCircle,
  Sparkles,
  Gamepad2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { UserStatistics } from '../../types';
import { formatTime } from '../Common/GameTimer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userStats: UserStatistics;
  onLogin: () => Promise<{ success: boolean; error?: string } | void> | void;
  onLogout: () => void;
}

export const LoginModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  userStats,
  onLogin,
  onLogout,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignInClick = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const res = await onLogin();
      if (res && !res.success && res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google 로그인 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setErrorMsg(null);
    setIsLoading(false);
    onClose();
  };

  return (
    <div
      id="login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) handleModalClose();
      }}
    >
      <div
        id="login-modal-card"
        className="w-full max-w-[480px] bg-gradient-to-b from-[#141a29]/98 to-[#0d121f]/98 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col relative max-h-[90vh] overflow-hidden"
      >
        {/* Close Top-Right Button */}
        <button
          id="close-login-x-btn"
          disabled={isLoading}
          onClick={handleModalClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-30 p-1.5 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Arcade Modal Header */}
        <div className="text-center mb-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-2.5 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            {user ? (
              <UserIcon className="w-6 h-6 text-emerald-300" />
            ) : (
              <Gamepad2 className="w-6 h-6 text-orange-400" />
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-orange-300 mb-1">
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span>FRUIT ARCADE CLOUD V2.0</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
            {user ? '플레이어 프로필 & 클라우드 상태' : 'Google 계정 클라우드 연동'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {user
              ? '플레이 데이터 및 최고 기록이 Firestore에 안전하게 보관 중입니다.'
              : '로그인하여 최고 기록과 21종 명예 업적을 클라우드에 안전하게 보관하세요.'}
          </p>
        </div>

        {/* Error Alert Display */}
        {errorMsg && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/35 flex items-start gap-2.5 text-rose-300 text-xs shrink-0 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <p className="font-bold text-rose-200">로그인 실패</p>
              <p className="text-[11px] text-rose-300/90 mt-0.5 leading-relaxed">{errorMsg}</p>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-rose-200 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
          {user ? (
            /* Logged-In User Profile Card & Stats */
            <div className="space-y-3">
              {/* Profile Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3.5 shadow-[0_4px_20px_rgba(16,185,129,0.1)]">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                      {user.displayName || '상큼 게이머'}
                    </h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                      연동됨
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>
              </div>

              {/* Player Stats Grid */}
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5">
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> 종합 아케이드 통계
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">총 플레이 횟수</span>
                    <span className="text-sm font-mono font-black text-slate-100">
                      {userStats.totalPlayCount}회
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-[10px] text-slate-400 block">총 플레이 타임</span>
                    <span className="text-sm font-mono font-black text-blue-400">
                      {formatTime(userStats.totalPlayTime)}
                    </span>
                  </div>
                </div>

                {/* Best Scores Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                    <span className="text-[9px] text-orange-300 font-bold block truncate">메모리 카드</span>
                    <span className="text-xs font-mono font-black text-white">
                      {userStats.memoryHighScore}점
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[9px] text-emerald-300 font-bold block truncate">수박 게임</span>
                    <span className="text-xs font-mono font-black text-white">
                      {userStats.suikaHighScore}점
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <span className="text-[9px] text-rose-300 font-bold block truncate">FRUIT DASH</span>
                    <span className="text-xs font-mono font-black text-white">
                      {userStats.dashHighScore}점
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-[9px] text-blue-300 font-bold block truncate">주식 트레이딩</span>
                    <span className="text-xs font-mono font-black text-white">
                      {userStats.stockHighScore ? `${(userStats.stockHighScore / 10000).toFixed(0)}만` : '0원'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Security Notice */}
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Firestore UID 격리 보안 규칙이 적용되어 다른 사용자로부터 고객님의 데이터가 안전하게 보호됩니다.
                </p>
              </div>

              {/* Logout Action */}
              <button
                onClick={() => {
                  onLogout();
                  handleModalClose();
                }}
                className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> 계정 로그아웃
              </button>
            </div>
          ) : (
            /* Logged-Out Login Promotion Card */
            <div className="space-y-3.5">
              {/* Google Sign-in CTA with Loading state */}
              <button
                onClick={handleSignInClick}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 active:bg-slate-200 disabled:opacity-60 text-slate-900 font-extrabold text-sm shadow-[0_4px_20px_rgba(255,255,255,0.15)] transition-all flex items-center justify-center gap-3 cursor-pointer group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-orange-600 shrink-0" />
                    <span>Google 인증 진행 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Google 계정으로 계속하기</span>
                  </>
                )}
              </button>

              {/* Feature Highlights */}
              <div className="space-y-2 pt-1">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                  <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400 shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">실시간 클라우드 자동 동기화</h4>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      브라우저 캐시가 삭제되거나 기기를 변경해도 게임 플레이 데이터가 안전하게 유지됩니다.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                  <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">명예의 전당 & 21종 업적 보관</h4>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      달성한 모든 도전 과제 훈장이 계정에 영구적으로 각인됩니다.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">철저한 데이터 보호</h4>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                      오직 본인의 인증 토큰으로만 읽고 쓸 수 있는 보안 규칙이 적용됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <button
          id="close-login-btn"
          disabled={isLoading}
          onClick={handleModalClose}
          className="mt-3 w-full py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/5 disabled:opacity-30 border border-white/10 rounded-2xl text-xs sm:text-sm font-bold text-slate-300 transition-colors cursor-pointer shrink-0"
        >
          닫기
        </button>
      </div>
    </div>
  );
};
