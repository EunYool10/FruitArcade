import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  RotateCcw,
  Home,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Briefcase,
  History,
  Calculator,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StockItem, NewsItem, PortfolioPosition, TradeHistoryItem, GameSettings } from '../../types';
import { playSound } from '../../utils/audio';
import { GameTimer, formatTime } from '../Common/GameTimer';

const S_DIFF = [
  { label: '초급', hint: true, vol: 0.008, newsVol: 0.7 },
  { label: '중급', hint: false, vol: 0.012, newsVol: 0.85 },
  { label: '고급', hint: false, vol: 0.018, newsVol: 1.0 },
];

const S_BASE: { ticker: string; name: string; price: number }[] = [
  { ticker: 'SAMS', name: '삼성전자', price: 72000 },
  { ticker: 'KAKAO', name: '카카오', price: 48000 },
  { ticker: 'NAVER', name: '네이버', price: 185000 },
  { ticker: 'HYND', name: '현대차', price: 215000 },
  { ticker: 'LGEL', name: 'LG전자', price: 95000 },
  { ticker: 'CELT', name: '셀트리온', price: 168000 },
];

const S_NEWS_POOL: NewsItem[] = [
  { h: '삼성전자, 차세대 HBM4 양산 성공', s: '메모리 반도체 점유율 확대 기대', tag: 'positive', hint: 'SAMS 상승 가능성', t: ['SAMS'], e: [0.06, 0.1] },
  { h: '카카오, 대규모 구조조정 단행 예정', s: '전체 인력 15% 감축 계획 유출', tag: 'negative', hint: 'KAKAO 하락 가능성', t: ['KAKAO'], e: [-0.09, -0.05] },
  { h: '네이버, AI 검색 점유율 70% 돌파', s: '광고 매출 전년 대비 40% 성장', tag: 'positive', hint: 'NAVER 상승 가능성', t: ['NAVER'], e: [0.05, 0.09] },
  { h: '현대차, 미국 전기차 보조금 제외', s: '인플레이션 감축법 개정안 영향', tag: 'negative', hint: 'HYND 하락 가능성', t: ['HYND'], e: [-0.08, -0.04] },
  { h: 'LG전자, 프리미엄 가전 글로벌 1위', s: '북미·유럽 시장 동반 성장', tag: 'positive', hint: 'LGEL 상승 가능성', t: ['LGEL'], e: [0.04, 0.08] },
  { h: '셀트리온, FDA 바이오시밀러 승인', s: '미국 시장 진출 본격화', tag: 'positive', hint: 'CELT 상승 가능성', t: ['CELT'], e: [0.07, 0.12] },
  { h: '반도체 업황 전반 둔화 우려', s: '글로벌 수요 감소 전망 보고서', tag: 'negative', hint: 'SAMS·LGEL 하락 가능성', t: ['SAMS', 'LGEL'], e: [-0.06, -0.03] },
  { h: '인터넷 플랫폼 규제 법안 통과', s: '빅테크 과징금 부과 기준 강화', tag: 'negative', hint: 'KAKAO·NAVER 하락 가능성', t: ['KAKAO', 'NAVER'], e: [-0.05, -0.02] },
  { h: '전기차 배터리 원자재 가격 급락', s: '리튬·코발트 가격 30% 하락', tag: 'positive', hint: 'HYND 상승 가능성', t: ['HYND'], e: [0.03, 0.07] },
  { h: '바이오 섹터 임상 실패 연속 보고', s: '3개 기업 3상 임상 실패 발표', tag: 'negative', hint: 'CELT 하락 가능성', t: ['CELT'], e: [-0.1, -0.06] },
  { h: '외국인 투자자 코스피 대규모 순매수', s: '2조원 규모 매수세 유입', tag: 'positive', hint: '전 종목 소폭 상승', t: ['SAMS', 'KAKAO', 'NAVER', 'HYND', 'LGEL', 'CELT'], e: [0.01, 0.03] },
  { h: '원달러 환율 1,450원 돌파', s: '수출주 수혜, 내수주 부담', tag: 'neutral', hint: 'SAMS·HYND 상승 가능성', t: ['SAMS', 'HYND'], e: [0.02, 0.05] },
  { h: '삼성전자 파운드리, TSMC 추격', s: '2nm 공정 수율 개선 성공', tag: 'positive', hint: 'SAMS 강한 상승 가능성', t: ['SAMS'], e: [0.08, 0.13] },
  { h: '카카오페이, 금융당국 제재 예고', s: '불법 대출 중개 혐의 조사', tag: 'negative', hint: 'KAKAO 하락 가능성', t: ['KAKAO'], e: [-0.07, -0.04] },
  { h: '현대차·기아, 글로벌 판매 역대 최고', s: '1~5월 누적 판매 340만대 돌파', tag: 'positive', hint: 'HYND 상승 가능성', t: ['HYND'], e: [0.05, 0.09] },
  { h: '셀트리온, 유럽 바이오시밀러 점유율 1위', s: '유럽 5개국 동시 처방 확대', tag: 'positive', hint: 'CELT 상승 가능성', t: ['CELT'], e: [0.06, 0.11] },
  { h: '네이버 클라우드, 공공기관 수주 대박', s: '정부 디지털 전환 사업 독점 수주', tag: 'positive', hint: 'NAVER 상승 가능성', t: ['NAVER'], e: [0.04, 0.08] },
  { h: 'LG전자, 전장사업 적자 지속', s: '전기차 부품 수요 둔화 영향', tag: 'negative', hint: 'LGEL 하락 가능성', t: ['LGEL'], e: [-0.06, -0.03] },
];

const fmtKRW = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');
const fmtPct = (p: number) => (p >= 0 ? '+' : '') + p.toFixed(2) + '%';

interface Props {
  settings: GameSettings;
  onMenu: () => void;
  isPaused: boolean;
}

export const StockGame: React.FC<Props> = ({ settings, onMenu, isPaused }) => {
  const [diff, setDiff] = useState(0);
  const [balance, setBalance] = useState(10000000);
  const [round, setRound] = useState(1);
  const [stocks, setStocks] = useState<StockItem[]>(() =>
    S_BASE.map((s) => ({ ...s, prev: s.price, chg: 0, pct: 0, hist: [s.price] }))
  );
  const [curNews, setCurNews] = useState<NewsItem[]>([]);
  const [selStock, setSelStock] = useState<string | null>('SAMS');
  const [selNews, setSelNews] = useState<NewsItem | null>(null);
  const [tradeQty, setTradeQty] = useState(1);
  const [portfolio, setPortfolio] = useState<{ [ticker: string]: PortfolioPosition }>({});
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [assetHist, setAssetHist] = useState<number[]>([10000000]);
  const [showExpectedProfit, setShowExpectedProfit] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ id: string; type: 'buy' | 'sell' | 'info'; text: string; sub?: string } | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [flashingStocks, setFlashingStocks] = useState<{ [ticker: string]: 'up' | 'down' }>({});
  const [elapsedTime, setElapsedTime] = useState(0);

  const assetCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveTickRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const goalAsset = 20000000;
  const maxRounds = 10;

  // Track elapsed play time
  useEffect(() => {
    if (!isGameOver && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isGameOver, isPaused]);

  const showToast = useCallback((type: 'buy' | 'sell' | 'info', text: string, sub?: string) => {
    setToastMsg({ id: Math.random().toString(), type, text, sub });
    setTimeout(() => {
      setToastMsg((prev) => (prev?.text === text ? null : prev));
    }, 2400);
  }, []);

  // Pick 3 random news items for the round
  const generateNews = useCallback(() => {
    const pool = [...S_NEWS_POOL].sort(() => Math.random() - 0.5);
    const picked = pool.slice(0, 3);
    setCurNews(picked);
    setSelNews(null);
  }, []);

  // Init / Reset
  const initGame = useCallback(() => {
    setBalance(10000000);
    setRound(1);
    setPortfolio({});
    setTradeHistory([]);
    setAssetHist([10000000]);
    setIsGameOver(false);
    setElapsedTime(0);
    setTradeQty(1);
    setSelStock('SAMS');
    setStocks(S_BASE.map((s) => ({ ...s, prev: s.price, chg: 0, pct: 0, hist: [s.price] })));
    generateNews();
  }, [generateNews]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Live Micro-Ticks (ambient market movement)
  useEffect(() => {
    if (isPaused || isGameOver) {
      if (liveTickRef.current) clearInterval(liveTickRef.current);
      return;
    }

    liveTickRef.current = setInterval(() => {
      const vol = S_DIFF[diff].vol;
      setStocks((prev) =>
        prev.map((st) => {
          const r = (Math.random() - 0.495) * vol;
          const nextPrice = Math.max(100, Math.round(st.price * (1 + r)));
          const chg = nextPrice - st.prev;
          const pct = (chg / st.prev) * 100;
          const newHist = [...st.hist, nextPrice];
          if (newHist.length > 25) newHist.shift();
          return { ...st, price: nextPrice, chg, pct, hist: newHist };
        })
      );
    }, 1500);

    return () => {
      if (liveTickRef.current) clearInterval(liveTickRef.current);
    };
  }, [isPaused, isGameOver, diff]);

  // Draw Asset Chart
  useEffect(() => {
    const canvas = assetCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (assetHist.length < 2) return;

    const mn = Math.min(...assetHist) * 0.99;
    const mx = Math.max(...assetHist) * 1.01;
    const range = mx - mn || 1;
    const last = assetHist[assetHist.length - 1];
    const isUp = last >= assetHist[0];
    const color = isUp ? '#10b981' : '#ef4444';

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, isUp ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    assetHist.forEach((v, i) => {
      const x = (i / (assetHist.length - 1)) * w;
      const y = h - ((v - mn) / range) * (h - 12) - 6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    assetHist.forEach((v, i) => {
      const x = (i / (assetHist.length - 1)) * w;
      const y = h - ((v - mn) / range) * (h - 12) - 6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [assetHist]);

  // Selected Stock Item
  const activeStock = stocks.find((s) => s.ticker === selStock) || stocks[0];
  const activePos = selStock ? portfolio[selStock] : null;

  // Portfolio total valuation
  const totalStockVal = Object.keys(portfolio).reduce((acc, ticker) => {
    const pos = portfolio[ticker];
    if (!pos || pos.qty <= 0) return acc;
    const st = stocks.find((s) => s.ticker === ticker);
    return acc + (st ? st.price * pos.qty : 0);
  }, 0);

  const totalAsset = balance + totalStockVal;
  const totalCost = Object.keys(portfolio).reduce((acc, ticker) => {
    const pos = portfolio[ticker];
    return acc + (pos && pos.qty > 0 ? pos.avg * pos.qty : 0);
  }, 0);
  const totalPnL = totalStockVal - totalCost;

  // Execute Buy
  const handleBuy = useCallback(() => {
    if (!activeStock || tradeQty <= 0) return;
    const cost = activeStock.price * tradeQty;
    if (cost > balance) {
      showToast('info', '잔액이 부족합니다!', `필요 금액: ${fmtKRW(cost)}`);
      return;
    }

    setBalance((b) => b - cost);
    setPortfolio((prev) => {
      const current = prev[activeStock.ticker] || { qty: 0, avg: 0 };
      const newQty = current.qty + tradeQty;
      const newAvg = (current.avg * current.qty + activeStock.price * tradeQty) / newQty;
      return { ...prev, [activeStock.ticker]: { qty: newQty, avg: newAvg } };
    });

    setTradeHistory((prev) => [
      ...prev,
      { type: 'buy', ticker: activeStock.ticker, qty: tradeQty, price: activeStock.price, total: cost },
    ]);

    playSound('buy', settings);
    showToast('buy', `${activeStock.ticker} ${tradeQty}주 매수 체결`, `-${fmtKRW(cost)}`);

    if (tradeQty >= 10 && settings.celebrateEffect) {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    }
  }, [activeStock, tradeQty, balance, settings, showToast]);

  // Execute Sell
  const handleSell = useCallback(() => {
    if (!activeStock || tradeQty <= 0) return;
    const current = portfolio[activeStock.ticker];
    if (!current || current.qty < tradeQty) {
      showToast('info', '보유 수량이 부족합니다!');
      return;
    }

    const revenue = activeStock.price * tradeQty;
    setBalance((b) => b + revenue);
    setPortfolio((prev) => {
      const newQty = current.qty - tradeQty;
      return { ...prev, [activeStock.ticker]: { ...current, qty: newQty } };
    });

    setTradeHistory((prev) => [
      ...prev,
      { type: 'sell', ticker: activeStock.ticker, qty: tradeQty, price: activeStock.price, total: revenue },
    ]);

    playSound('sell', settings);
    showToast('sell', `${activeStock.ticker} ${tradeQty}주 매도 체결`, `+${fmtKRW(revenue)}`);
  }, [activeStock, tradeQty, portfolio, settings, showToast]);

  // Advance Next Round
  const handleNextRound = useCallback(() => {
    const nextR = round + 1;
    const diffConfig = S_DIFF[diff];
    const newFlashing: { [t: string]: 'up' | 'down' } = {};

    // Apply News Impact
    const updatedStocks = stocks.map((st) => {
      let impactRate = (Math.random() - 0.48) * 0.025; // baseline small noise

      curNews.forEach((news) => {
        if (news.t.includes(st.ticker)) {
          const baseRate = news.e[0] + Math.random() * (news.e[1] - news.e[0]);
          impactRate += baseRate * diffConfig.newsVol;
        }
      });

      const nextP = Math.max(100, Math.round(st.price * (1 + impactRate)));
      const chg = nextP - st.price;
      const pct = (chg / st.price) * 100;
      const newHist = [...st.hist, nextP];
      if (newHist.length > 25) newHist.shift();

      newFlashing[st.ticker] = impactRate >= 0 ? 'up' : 'down';

      return {
        ...st,
        prev: st.price,
        price: nextP,
        chg,
        pct,
        hist: newHist,
      };
    });

    setStocks(updatedStocks);
    setFlashingStocks(newFlashing);
    setTimeout(() => setFlashingStocks({}), 1000);

    // Calculate current total assets
    const curVal = Object.keys(portfolio).reduce((acc, t) => {
      const pos = portfolio[t];
      if (!pos || pos.qty <= 0) return acc;
      const sItem = updatedStocks.find((s) => s.ticker === t);
      return acc + (sItem ? sItem.price * pos.qty : 0);
    }, 0);

    const nextAssetTotal = balance + curVal;
    setAssetHist((prev) => [...prev, nextAssetTotal]);

    if (nextR > maxRounds) {
      setIsGameOver(true);
      playSound(nextAssetTotal >= goalAsset ? 'victory' : 'over', settings);
      if (nextAssetTotal >= goalAsset && settings.celebrateEffect) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    } else {
      setRound(nextR);
      generateNews();
      playSound('click', settings);
    }
  }, [round, diff, stocks, curNews, portfolio, balance, goalAsset, maxRounds, settings, generateNews]);

  // Keyboard Shortcuts (B, S, N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver || isPaused) return;
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleBuy();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleSell();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNextRound();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBuy, handleSell, handleNextRound, isGameOver, isPaused]);

  const isWin = totalAsset >= goalAsset;
  const netPnL = totalAsset - 10000000;
  const netPct = (netPnL / 10000000) * 100;

  return (
    <div id="stock-game-board" className="flex-1 flex flex-col p-[var(--ui-space-lg)] max-w-5xl w-full mx-auto animate-in fade-in duration-300 select-none overflow-y-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-16 right-4 z-50 p-3 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-right duration-200 ${
            toastMsg.type === 'buy'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : toastMsg.type === 'sell'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-300'
              : 'bg-amber-950/90 border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="text-xl">{toastMsg.type === 'buy' ? '📈' : toastMsg.type === 'sell' ? '📉' : '💡'}</div>
          <div>
            <div className="font-extrabold text-xs">{toastMsg.text}</div>
            {toastMsg.sub && <div className="text-[10px] opacity-80">{toastMsg.sub}</div>}
          </div>
        </div>
      )}

      {/* Top Header Dashboard */}
      <div id="stock-hud" className="arcade-hud-box mb-3 flex-wrap">
        {/* Balance Display */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">현금 잔액 / 총 자산</div>
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-xl font-mono font-black text-blue-400">{fmtKRW(balance)}</span>
              <span className="text-xs text-slate-400 font-mono">/ 총 {fmtKRW(totalAsset)}</span>
            </div>
          </div>
        </div>

        {/* Round, Target & Timer */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <span>라운드</span>
            <span className="text-orange-400 font-mono font-black text-sm">{round}</span>
            <span className="text-slate-500">/ {maxRounds}</span>
          </div>

          <GameTimer seconds={elapsedTime} id="stock-timer" />

          <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs font-bold text-orange-300 hidden sm:flex items-center gap-1">
            <span>목표: ₩20,000,000</span>
          </div>
        </div>

        {/* Difficulty & Menu */}
        <div className="flex items-center gap-1.5">
          <div className="flex bg-slate-900 rounded-xl p-0.5 border border-white/10">
            {S_DIFF.map((d, i) => (
              <button
                key={d.label}
                onClick={() => {
                  setDiff(i);
                  showToast('info', `난이도 변경: ${d.label}`);
                }}
                className={`px-2.5 py-1 min-h-[36px] sm:min-h-0 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  diff === i ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={onMenu}
            className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap active:scale-95"
          >
            메뉴
          </button>
        </div>
      </div>

      {/* Ticker Tape */}
      <div className="w-full bg-[#0a0d18]/90 border border-white/10 rounded-xl h-8 overflow-hidden mb-3 flex items-center relative shadow-inner">
        <div className="flex items-center whitespace-nowrap animate-tape">
          {[...stocks, ...stocks].map((st, i) => {
            const isUp = st.pct > 0;
            const isDown = st.pct < 0;
            return (
              <div key={`${st.ticker}-${i}`} className="inline-flex items-center gap-2 px-4 text-xs font-mono">
                <span className="font-bold text-slate-200">{st.ticker}</span>
                <span className="text-slate-400">{fmtKRW(st.price)}</span>
                <span className={`font-bold ${isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-slate-400'}`}>
                  {isUp ? '▲' : isDown ? '▼' : '─'} {fmtPct(st.pct)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Trading 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1">
        {/* Left Column: News, Stock List, Asset Graph (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Round News */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#141a29]/90 to-[#0f1422]/90 border border-white/10 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-xs font-black text-slate-300">
              <span className="flex items-center gap-1.5 text-blue-400">📰 라운드 속보 뉴스 (클릭 시 종목 선택)</span>
              <span className="text-[10px] text-slate-400">호재/악재 분석</span>
            </div>

            <div className="space-y-2">
              {curNews.map((news, i) => {
                const tagColor =
                  news.tag === 'positive'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : news.tag === 'negative'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                const tagLabel = news.tag === 'positive' ? '호재' : news.tag === 'negative' ? '악재' : '중립';
                const isSelected = selNews?.h === news.h;

                return (
                  <div
                    key={i}
                    onClick={() => {
                      setSelNews(news);
                      if (news.t.length > 0) setSelStock(news.t[0]);
                      playSound('click', settings);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-500/15 border-blue-400/60 shadow-md'
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${tagColor}`}>
                        {tagLabel}
                      </span>
                      <span className="text-xs font-extrabold text-slate-200">{news.h}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{news.s}</p>
                    {S_DIFF[diff].hint && (
                      <div className="text-[10px] text-blue-300 font-bold mt-1 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" /> 힌트: {news.hint}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock Ticker Table */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#141a29]/90 to-[#0f1422]/90 border border-white/10 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-xs font-black text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400">⚡ 실시간 종목 시세표</span>
              <span className="text-[10px] text-slate-400">클릭하여 매매 선택</span>
            </div>

            <div className="space-y-1.5">
              {stocks.map((st) => {
                const isSelected = selStock === st.ticker;
                const isUp = st.pct > 0;
                const isDown = st.pct < 0;
                const flash = flashingStocks[st.ticker];

                return (
                  <div
                    key={st.ticker}
                    onClick={() => {
                      setSelStock(st.ticker);
                      playSound('click', settings);
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-500/20 border-blue-500/60 shadow-md'
                        : 'bg-white/5 border-white/5 hover:border-white/15'
                    } ${flash === 'up' ? 'bg-emerald-500/30' : flash === 'down' ? 'bg-rose-500/30' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <span className="font-mono font-black text-xs text-slate-200">{st.ticker}</span>
                      <span className="text-xs text-slate-400">{st.name}</span>
                    </div>

                    {/* Price and Pct */}
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs sm:text-sm text-slate-100">{fmtKRW(st.price)}</span>
                      <span
                        className={`min-w-[65px] text-right font-mono font-black text-xs ${
                          isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {isUp ? '▲' : isDown ? '▼' : '─'} {fmtPct(st.pct)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Asset Growth Canvas */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#141a29]/90 to-[#0f1422]/90 border border-white/10 shadow-lg space-y-1">
            <div className="flex justify-between items-center text-xs font-black text-slate-300">
              <span className="flex items-center gap-1.5 text-purple-400">📊 자산 변화 추이</span>
              <span className="text-[11px] font-mono font-bold text-slate-300">{fmtKRW(totalAsset)}</span>
            </div>
            <div className="w-full h-16 relative">
              <canvas ref={assetCanvasRef} width={400} height={64} className="w-full h-full block rounded-lg" />
            </div>
          </div>
        </div>

        {/* Right Column: Order Book, Holdings, History (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {/* Order Placement Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-[#141a29]/95 to-[#0f1422]/95 border border-orange-500/30 shadow-xl space-y-3">
            <div className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center justify-between">
              <span>⚡ 원클릭 매매 주문</span>
              <button
                onClick={() => setShowExpectedProfit((p) => !p)}
                className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 transition-all ${
                  showExpectedProfit
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                <Calculator className="w-3 h-3" /> 예상 손익
              </button>
            </div>

            {/* Selected Stock Info Banner */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="text-xs text-slate-400">
                {activeStock.name} <span className="font-mono font-bold text-slate-200">({activeStock.ticker})</span>
              </div>
              <div className="text-2xl font-mono font-black text-orange-400 mt-0.5">{fmtKRW(activeStock.price)}</div>
              <div className="text-[11px] font-mono font-bold text-slate-400 mt-0.5">
                보유량: <span className="text-slate-200">{activePos?.qty || 0}주</span>
                {activePos && activePos.qty > 0 && ` (평단가: ${fmtKRW(activePos.avg)})`}
              </div>
            </div>

            {/* Expected Profit / Loss Box */}
            {showExpectedProfit && activePos && activePos.qty > 0 && (
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs space-y-1 animate-in fade-in">
                <div className="flex justify-between text-slate-400">
                  <span>평가 손익</span>
                  <span
                    className={`font-bold font-mono ${
                      activeStock.price >= activePos.avg ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {fmtKRW((activeStock.price - activePos.avg) * activePos.qty)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>수익률</span>
                  <span
                    className={`font-bold font-mono ${
                      activeStock.price >= activePos.avg ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {fmtPct(((activeStock.price - activePos.avg) / activePos.avg) * 100)}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity Controls */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 shrink-0">수량:</span>
              <button
                onClick={() => setTradeQty((q) => Math.max(1, q - 10))}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs"
              >
                -10
              </button>
              <button
                onClick={() => setTradeQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs"
              >
                -1
              </button>
              <input
                type="number"
                min="1"
                value={tradeQty}
                onChange={(e) => setTradeQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 min-w-0 h-8 rounded-lg bg-slate-900 border border-white/10 text-center font-mono font-bold text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => setTradeQty((q) => q + 1)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs"
              >
                +1
              </button>
              <button
                onClick={() => setTradeQty((q) => q + 10)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs"
              >
                +10
              </button>
              <button
                onClick={() => {
                  const maxAfford = Math.floor(balance / activeStock.price);
                  setTradeQty(Math.max(1, maxAfford));
                }}
                className="px-2 h-8 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 font-extrabold text-[11px]"
              >
                MAX
              </button>
            </div>

            {/* Buy / Sell Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="s-bbuy"
                onClick={handleBuy}
                disabled={activeStock.price * tradeQty > balance}
                className="h-[var(--ui-btn-h-lg)] min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" /> 매수 [B]
              </button>
              <button
                id="s-bsell"
                onClick={handleSell}
                disabled={!activePos || activePos.qty < tradeQty}
                className="h-[var(--ui-btn-h-lg)] min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <TrendingDown className="w-4 h-4" /> 매도 [S]
              </button>
            </div>

            {/* Next Round Button */}
            <button
              onClick={handleNextRound}
              className="w-full h-[var(--ui-btn-h-lg)] min-h-[44px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <span>다음 라운드 넘어가기 [N]</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Holdings Portfolio Box */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#141a29]/90 to-[#0f1422]/90 border border-white/10 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-xs font-black text-slate-300">
              <span className="flex items-center gap-1.5 text-blue-400">💼 보유 주식 포트폴리오</span>
              <span className={`font-mono font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmtKRW(totalPnL)}
              </span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {Object.keys(portfolio).filter((k) => portfolio[k].qty > 0).length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-500">보유 중인 주식이 없습니다</div>
              ) : (
                Object.keys(portfolio)
                  .filter((k) => portfolio[k].qty > 0)
                  .map((ticker) => {
                    const pos = portfolio[ticker];
                    const st = stocks.find((s) => s.ticker === ticker);
                    const curPrice = st?.price || pos.avg;
                    const val = curPrice * pos.qty;
                    const cost = pos.avg * pos.qty;
                    const pnl = val - cost;
                    const pct = (pnl / cost) * 100;
                    const isUp = pnl >= 0;

                    return (
                      <div
                        key={ticker}
                        onClick={() => setSelStock(ticker)}
                        className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs cursor-pointer hover:border-white/20"
                      >
                        <div>
                          <span className="font-mono font-black text-slate-200 mr-2">{ticker}</span>
                          <span className="text-slate-400">{pos.qty}주</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-200">{fmtKRW(val)}</div>
                          <div className={`text-[10px] font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isUp ? '+' : ''}
                            {fmtKRW(pnl)} ({fmtPct(pct)})
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Trade History */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#141a29]/90 to-[#0f1422]/90 border border-white/10 shadow-lg space-y-1.5">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> 체결 기록 ({tradeHistory.length}회)
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px]">
              {tradeHistory.length === 0 ? (
                <div className="text-center py-2 text-slate-500 text-xs">체결된 거래가 없습니다</div>
              ) : (
                [...tradeHistory].reverse().map((th, i) => (
                  <div key={i} className="flex justify-between items-center py-0.5 border-b border-white/5">
                    <span
                      className={`px-1.5 py-0.2 rounded font-black text-[9px] ${
                        th.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {th.type === 'buy' ? '매수' : '매도'}
                    </span>
                    <span className="font-mono text-slate-300">
                      {th.ticker} {th.qty}주 @ {fmtKRW(th.price)}
                    </span>
                    <span className="font-mono text-slate-400 font-bold">{fmtKRW(th.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Result Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`w-full max-w-sm rounded-3xl p-6 sm:p-7 shadow-2xl text-center flex flex-col items-center border ${
              isWin
                ? 'bg-gradient-to-b from-[#0f241d] to-[#091511] border-emerald-500/40'
                : 'bg-gradient-to-b from-[#251216] to-[#12080a] border-rose-500/40'
            }`}
          >
            <div className="text-5xl mb-2">{isWin ? '🏆' : '📉'}</div>
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isWin ? '목표 달성 성공!' : '게임 오버'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              {isWin
                ? '축하합니다! 10라운드 안에 2천만원 자산을 달성했습니다!'
                : '아쉽게도 목표 자산(2천만원)에 도달하지 못했습니다.'}
            </p>

            <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
                <div className="text-[11px] font-bold text-slate-400">최종 자산</div>
                <div className="text-base font-black font-mono text-blue-400 mt-0.5">{fmtKRW(totalAsset)}</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
                <div className="text-[11px] font-bold text-slate-400">총 손익</div>
                <div
                  className={`text-base font-black font-mono mt-0.5 ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {fmtKRW(netPnL)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
                <div className="text-[11px] font-bold text-slate-400">수익률</div>
                <div
                  className={`text-base font-black font-mono mt-0.5 ${netPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {fmtPct(netPct)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left">
                <div className="text-[11px] font-bold text-slate-400">총 거래 횟수</div>
                <div className="text-base font-black font-mono text-slate-200 mt-0.5">{tradeHistory.length}회</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-left sm:col-span-2">
                <div className="text-[11px] font-bold text-slate-400">총 플레이 시간</div>
                <div className="text-base font-black font-mono text-blue-400 mt-0.5">{formatTime(elapsedTime)}</div>
              </div>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={initGame}
                className="w-full btn-arcade-primary flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> 다시 도전하기
              </button>
              <button
                onClick={onMenu}
                className="w-full btn-arcade-secondary flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> 메인 메뉴로
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
