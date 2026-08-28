import React from 'react';
import { FileText, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PatchNotesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="patch-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#141a29] to-[#0d111d] border border-orange-500/30 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col max-h-[85vh]">
        {/* Close Button */}
        <button
          id="close-patch-x-btn"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 mb-2">
            <FileText className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">업데이트 패치노트</h2>
          <p className="text-xs text-slate-400 mt-1">상큼 과일 아케이드 존의 최신 개선사항 및 업데이트 히스토리</p>
        </div>

        {/* Patch List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* v2.1.0 Cloud & Dash Update */}
          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-orange-500 text-white">LATEST</span>
              <h3 className="font-extrabold text-sm text-orange-300">v2.1.0 구글 연동 & 신규 게임 FRUIT DASH</h3>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li><b>Google 계정 및 클라우드 동기화</b>: 원클릭 로그인으로 진행 상황, 업적, 최고 점수 안전 보관.</li>
              <li><b>신규 4번째 미니게임 [FRUIT DASH] 출시</b>: 쏟아지는 과일 폭탄을 피하며 황금 별을 채집하는 스릴 만점 회피 질주 아케이드.</li>
              <li><b>업적 시스템 확장</b>: FRUIT DASH 신규 도전과제 4종 추가 (총 21종 체계로 확장).</li>
              <li><b>인게임 타이머 및 HUD 시각성 개선</b>: 모든 게임에 표준화된 세련된 타이머와 계층화된 점수 패널 적용.</li>
            </ul>
          </div>

          {/* v2.0 React Overhaul */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
            <h3 className="font-extrabold text-sm text-amber-300 mb-2">v2.0.0 React & UI/CSS 전면 대개편</h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li><b>React + Tailwind CSS 풀 리팩토링</b>: 현대적인 글래스모피즘 아케이드 비주얼 및 고품질 애니메이션 적용.</li>
              <li><b>수박 게임 물리 엔진 최적화</b>: 부드러운 과일 회전, 탄성 충돌, 조준 가이드 및 직관적인 터치 드롭 구현.</li>
              <li><b>주식 뉴스 트레이딩 강화</b>: 실시간 틱 차트, 스파크라인, 단축키 지원(B/S/N) 및 수익 분석 계산기 탑재.</li>
              <li><b>접근성 및 설정 확장</b>: 고대비 카드 모드, 카드 크기 조절, 효과음 볼륨 정밀 조절 지원.</li>
            </ul>
          </div>

          {/* v1.1.15 */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10">
            <h3 className="font-extrabold text-sm text-slate-200 mb-2">v1.1.15 버그 수정 종합 패치</h3>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li><b>[주식] 다크모드</b>: 주식 게임 기본 다크모드 적용 및 테마 전환 버튼 탑재.</li>
              <li><b>[주식] 수량 입력</b>: 음수·0 직접 입력 시 자동으로 1로 보정.</li>
              <li><b>[수박] 벽 뚫기 방지</b>: 쌓인 과일이 좌우 벽 밖으로 밀려나는 현상 차단.</li>
              <li><b>[수박] 위험 데드라인</b>: 과일이 상단 선을 넘었을 때 카운트다운 로직 정밀화.</li>
            </ul>
          </div>
        </div>

        {/* Footer Close */}
        <button
          id="close-patch-btn"
          onClick={onClose}
          className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-slate-300 transition-colors cursor-pointer"
        >
          확인 완료
        </button>
      </div>
    </div>
  );
};

