import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Zap, Flame, Clock, Heart, Settings, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MemoryMode, LifeLimit, GameSettings, MemoryCard } from '../../types';
import { playSound } from '../../utils/audio';
import { unlockAchievement } from '../../utils/achievements';
import { MemoryResultModal } from './MemoryResultModal';

const FRUITS = [
  '🍎', '🍊', '🍌', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝', '🍉',
  '🍈', '🍏', '🍋', '🍐', '🫐', '🥥', '🥭', '🥑', '🥦', '🍅',
  '🥕', '🌽', '🌶️', '🫑', '🥔', '🍆', '🌰', '🥜', '🍄', '🧅',
  '🧄', '🍠'
];

const FRUIT_COLORS: { [key: string]: string } = {
  '🍎': 'from-red-500/20 to-red-600/30 border-red-500/40 text-red-200',
  '🍊': 'from-orange-500/20 to-orange-600/30 border-orange-500/40 text-orange-200',
  '🍌': 'from-yellow-500/20 to-yellow-600/30 border-yellow-500/40 text-yellow-200',
  '🍇': 'from-purple-500/20 to-purple-600/30 border-purple-500/40 text-purple-200',
  '🍓': 'from-rose-500/20 to-rose-600/30 border-rose-500/40 text-rose-200',
  '🍒': 'from-pink-500/20 to-pink-600/30 border-pink-500/40 text-pink-200',
  '🍑': 'from-amber-500/20 to-amber-600/30 border-amber-500/40 text-amber-200',
  '🍍': 'from-yellow-400/20 to-amber-500/30 border-yellow-400/40 text-yellow-100',
  '🥝': 'from-lime-500/20 to-green-600/30 border-lime-500/40 text-lime-200',
  '🍉': 'from-emerald-500/20 to-red-500/30 border-emerald-500/40 text-emerald-200',
  '🍈': 'from-teal-500/20 to-teal-600/30 border-teal-500/40 text-teal-200',
  '🍏': 'from-green-500/20 to-green-600/30 border-green-500/40 text-green-200',
  '🍋': 'from-yellow-300/20 to-yellow-500/30 border-yellow-300/40 text-yellow-100',
  '🍐': 'from-lime-400/20 to-lime-600/30 border-lime-400/40 text-lime-100',
  '🫐': 'from-blue-500/20 to-indigo-600/30 border-blue-500/40 text-blue-200',
  '🥥': 'from-stone-500/20 to-stone-600/30 border-stone-500/40 text-stone-200',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  mode: MemoryMode;
  previewTime: number;
  lifeLimit: LifeLimit;
  settings: GameSettings;
  onOpenSettings: () => void;
  onMenu: () => void;
  onRetry: () => void;
  onUnlockAchieve: (id: string) => void;
  isPaused: boolean;
}

export const MemoryGameBoard: React.FC<Props> = ({
  mode,
  previewTime,
  lifeLimit,
  settings,
  onOpenSettings,
  onMenu,
  onRetry,
  onUnlockAchieve,
  isPaused,
}) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedCount, setMatchedCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(180.0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [statusMsg, setStatusMsg] = useState('카드를 기억하세요!');
  const [statusColor, setStatusColor] = useState('text-amber-400');
  const [flashHints, setFlashHints] = useState(1);
  const [cardHints, setCardHints] = useState(1);
  const [hintUsed, setHintUsed] = useState(false);
  const [jokerStreak, setJokerStreak] = useState(0);
  const [maxJokerStreak, setMaxJokerStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [failReason, setFailReason] = useState<'time' | 'life' | 'quit' | undefined>(undefined);
  const [shakingCardIndex, setShakingCardIndex] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoFlashTriggered = useRef(false);

  const is8Normal = mode === '8';
  const isJokerMode = mode === '8-joker';
  const gridSize = mode === '4' ? 4 : mode === '6' ? 6 : 8;

  const showStatus = useCallback((text: string, color: string, duration = 2000) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusMsg(text);
    setStatusColor(color);
    statusTimerRef.current = setTimeout(() => {
      setStatusMsg('상큼하게 진행 중...');
      setStatusColor('text-emerald-400');
    }, duration);
  }, []);

  // Flash hints trigger
  const triggerFlash = useCallback((pairsCount: number, label: string) => {
    setCards((prev) => {
      const candidates = prev.filter(
        (c) => !c.isMatched && !c.isSpecial && c.value !== '🃏'
      );
      if (candidates.length === 0) return prev;

      const uniqueVals = shuffle([...new Set(candidates.map((c) => c.value))]).slice(0, pairsCount);
      return prev.map((c) => {
        if (uniqueVals.includes(c.value)) {
          return { ...c, isFlashing: true };
        }
        return c;
      });
    });

    showStatus(`⭐ ${label}! (${pairsCount}쌍 반짝임)`, 'text-amber-400', 2000);

    setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isFlashing: false })));
    }, 1600);
  }, [showStatus]);

  // Init game board
  useEffect(() => {
    let cardValues: string[] = [];
    if (mode === '8-joker') {
      const selectedFruits = FRUITS.slice(0, 28);
      const jokers = Array(8).fill('🃏');
      cardValues = shuffle([...selectedFruits, ...selectedFruits, ...jokers]);
    } else if (mode === '8') {
      const selectedFruits = FRUITS.slice(0, 30);
      const base = shuffle([...selectedFruits, ...selectedFruits]);
      cardValues = shuffle([...base, '🃏HINT', '🃏HINT', '💡FLASH', '💡FLASH']);
    } else {
      const num = parseInt(mode);
      const total = (num * num) / 2;
      const selectedFruits = FRUITS.slice(0, total);
      cardValues = shuffle([...selectedFruits, ...selectedFruits]);
    }

    const initialCards: MemoryCard[] = cardValues.map((val, idx) => ({
      id: `${val}-${idx}`,
      value: val,
      index: idx,
      isFlipped: true, // initially flipped for preview
      isMatched: false,
      isSpecial: val === '🃏HINT' ? 'card-hint' : val === '💡FLASH' ? 'flash' : undefined,
    }));

    setCards(initialCards);
    setFlippedCards([]);
    setMatchedCount(0);
    setIsReady(false);
    setIsGameOver(false);
    setIsWin(false);
    setFailReason(undefined);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setWrongCount(0);
    setTimeElapsed(0);
    setTimeRemaining(180.0);
    setHintUsed(false);
    setJokerStreak(0);
    setMaxJokerStreak(0);
    autoFlashTriggered.current = false;

    const initHints = mode === '4' ? 1 : 2;
    setFlashHints(is8Normal ? 0 : initHints);
    setCardHints(is8Normal ? 0 : initHints);

    setStatusMsg('카드를 기억하세요!');
    setStatusColor('text-amber-400');

    // Preview timer
    const previewTimer = setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
      setIsReady(true);
      setStatusMsg('상큼하게 진행 중...');
      setStatusColor('text-emerald-400');
    }, previewTime);

    return () => {
      clearTimeout(previewTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [mode, previewTime, is8Normal]);

  // Main game timer
  useEffect(() => {
    if (!isReady || isGameOver || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 0.1);

      if (is8Normal) {
        setTimeRemaining((prev) => {
          if (prev <= 0.1) {
            handleGameOver(false, 'time');
            return 0;
          }
          return prev - 0.1;
        });
      }

      // 6x6 auto flash hint at 8.5s
      if (mode === '6' && !autoFlashTriggered.current) {
        setTimeElapsed((t) => {
          if (t >= 8.5 && !autoFlashTriggered.current) {
            autoFlashTriggered.current = true;
            triggerFlash(2, '시스템 지원 힌트');
          }
          return t;
        });
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isReady, isGameOver, isPaused, is8Normal, mode, triggerFlash]);

  // Check game achievements on game over
  const checkAchievements = useCallback((won: boolean, finalScore: number, finalMaxCombo: number, finalTime: number, finalWrong: number) => {
    if (finalMaxCombo >= 5) onUnlockAchieve('combo_king');
    if (finalMaxCombo === 7) onUnlockAchieve('lucky_seven');
    if (maxJokerStreak >= 3) onUnlockAchieve('joker_streak');
    if (finalScore < 0) onUnlockAchieve('minus_score');

    if (!won) {
      if (lifeLimit !== 'infinite') onUnlockAchieve('fail_is_mother');
      if (lifeLimit === '5' && !is8Normal && finalTime <= 15.0) {
        onUnlockAchieve('speedy_fail');
      }
    }

    if (won) {
      onUnlockAchieve('first_clear');
      if (finalScore >= 150) onUnlockAchieve('high_score');
      if (finalScore >= 250) onUnlockAchieve('score_rich');
      if (lifeLimit === '5') onUnlockAchieve('hardcore_clear');
      if (mode === '8-joker') onUnlockAchieve('joker_fever');
      if (mode === '8') onUnlockAchieve('time_attack_master');
      if (!hintUsed) onUnlockAchieve('no_hint_clear');
      if ((mode === '4' || mode === '6') && finalTime <= 20.0) {
        onUnlockAchieve('speed_racer');
      }
    }
  }, [lifeLimit, mode, hintUsed, maxJokerStreak, is8Normal, onUnlockAchieve]);

  const handleGameOver = useCallback((won: boolean, reason?: 'time' | 'life' | 'quit') => {
    setIsGameOver(true);
    setIsWin(won);
    setFailReason(reason);
    if (timerRef.current) clearInterval(timerRef.current);

    if (won) {
      playSound('victory', settings);
      if (settings.celebrateEffect) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
    } else {
      playSound('over', settings);
    }

    checkAchievements(won, score, maxCombo, timeElapsed, wrongCount);
  }, [settings, checkAchievements, score, maxCombo, timeElapsed, wrongCount]);

  // Use manual flash hint button
  const handleUseFlashHint = () => {
    if (!isReady || flashHints <= 0 || isGameOver) return;
    setHintUsed(true);
    setFlashHints((prev) => prev - 1);
    playSound('click', settings);
    triggerFlash(1, '아이템 찬스 힌트');
  };

  // Use card hint button
  const handleUseCardHint = () => {
    if (!isReady || cardHints <= 0 || isGameOver) return;
    setHintUsed(true);
    setCardHints((prev) => prev - 1);
    playSound('click', settings);

    const candidates = cards.filter((c) => !c.isMatched && !c.isFlipped && !c.isSpecial && c.value !== '🃏');
    if (candidates.length === 0) return;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    setCards((prev) => prev.map((c) => (c.id === target.id ? { ...c, isFlipped: true } : c)));
    showStatus('🃏 카드 힌트! 2초간 카드를 확인하세요!', 'text-blue-400', 2000);

    setTimeout(() => {
      setCards((prev) =>
        prev.map((c) => (c.id === target.id && !c.isMatched ? { ...c, isFlipped: false } : c))
      );
    }, 2000);
  };

  // Card click handler
  const handleCardClick = (index: number) => {
    if (!isReady || isGameOver || flippedCards.length >= 2) return;
    const card = cards[index];
    if (card.isFlipped || card.isMatched || card.isJokerRevealed || card.specialUsed) return;

    playSound('flip', settings);

    // 8x8 Joker Mode: Clicked a Joker 🃏
    if (isJokerMode && card.value === '🃏') {
      handleJokerClick(index);
      return;
    }

    // 8x8 Normal Mode: Clicked a Special Card
    if (is8Normal && card.isSpecial) {
      handleSpecialCardClick(index, card.isSpecial);
      return;
    }

    // Normal Card Flip
    const newFlipped = [...flippedCards, index];
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, isFlipped: true } : c)));
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setIsReady(false);
      checkMatch(newFlipped[0], newFlipped[1]);
    }
  };

  // Special Joker 3x3 surrounding reveal
  const handleJokerClick = (index: number) => {
    setIsReady(false);
    playSound('match', settings);

    const newJokerStreak = jokerStreak + 1;
    setJokerStreak(newJokerStreak);
    if (newJokerStreak > maxJokerStreak) setMaxJokerStreak(newJokerStreak);

    setScore((s) => s + 15);
    showStatus('🃏 조커 발동! 주변 카드가 3초간 노출됩니다! (+15점)', 'text-purple-400', 3000);

    const row = Math.floor(index / 8);
    const col = index % 8;
    const surroundingIndices: number[] = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          surroundingIndices.push(nr * 8 + nc);
        }
      }
    }

    setCards((prev) =>
      prev.map((c, i) => {
        if (i === index) return { ...c, isFlipped: true, isMatched: true };
        if (surroundingIndices.includes(i) && !c.isMatched) {
          return { ...c, isJokerRevealed: true };
        }
        return c;
      })
    );

    const newMatchedCount = matchedCount + 1;
    setMatchedCount(newMatchedCount);

    setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isJokerRevealed: false })));
      setIsReady(true);

      const jokersTotal = 8;
      const fruitsTotal = cards.length - jokersTotal;
      if (newMatchedCount >= fruitsTotal + jokersTotal) {
        handleGameOver(true);
      }
    }, 3000);
  };

  // Special Card Click in 8x8 normal mode
  const handleSpecialCardClick = (index: number, type: 'card-hint' | 'flash') => {
    setIsReady(false);
    playSound('match', settings);

    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, isFlipped: true, specialUsed: true } : c))
    );

    if (type === 'card-hint') {
      const candidates = cards.filter(
        (c) => !c.isMatched && !c.isFlipped && !c.isSpecial && !c.specialUsed && c.index !== index
      );
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        setCards((prev) => prev.map((c) => (c.id === target.id ? { ...c, isFlipped: true } : c)));
        showStatus('🃏 카드힌트 발동! 2초간 카드를 확인하세요!', 'text-blue-400', 2000);

        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.id === target.id && !c.isMatched ? { ...c, isFlipped: false } : c))
          );
          setIsReady(true);
        }, 2000);
      } else {
        setIsReady(true);
      }
    } else if (type === 'flash') {
      triggerFlash(2, '아이템 플래시 발동');
      setTimeout(() => {
        setIsReady(true);
      }, 2000);
    }
  };

  // Match check
  const checkMatch = (idx1: number, idx2: number) => {
    const card1 = cards[idx1];
    const card2 = cards[idx2];

    if (card1.value === card2.value) {
      // MATCH
      const newCombo = combo + 1;
      setCombo(newCombo);
      if (newCombo > maxCombo) setMaxCombo(newCombo);

      const scoreGained = 10;
      setScore((prevScore) => {
        const nextScore = prevScore + scoreGained;

        // Guard Hunter milestone check (every 30 points -> +1 Flash hint)
        const prevMilestone = Math.floor(prevScore / 30);
        const newMilestone = Math.floor(nextScore / 30);
        if (newMilestone > prevMilestone && !is8Normal) {
          setFlashHints((h) => h + 1);
          showStatus('🛡️ 가드헌터 발동! 플래시 힌트 +1 획득!', 'text-blue-400', 2200);
        }

        if (wrongCount === 0 && nextScore >= 100) {
          onUnlockAchieve('perfect_100');
        }

        return nextScore;
      });

      playSound('match', settings);
      if (newCombo >= 3 && newCombo % 3 === 0) {
        playSound('combo', settings);
        showStatus(`🔥 ${newCombo}연속 콤보 폭발!! 1쌍 보너스 힌트!`, 'text-rose-400', 2000);
        setTimeout(() => triggerFlash(1, '콤보 보너스 힌트'), 400);
      } else if (newCombo > 1) {
        playSound('combo', settings);
        showStatus(`🔥 ${newCombo}연속 콤보! (+10점)`, 'text-orange-400', 1500);
      } else {
        showStatus('맞췄습니다! (+10점)', 'text-emerald-400', 1200);
      }

      setCards((prev) =>
        prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isMatched: true } : c))
      );

      const newMatched = matchedCount + 2;
      setMatchedCount(newMatched);
      setFlippedCards([]);

      const specialCount = cards.filter((c) => c.isSpecial).length;
      const targetCount = cards.length - specialCount;

      if (newMatched >= targetCount) {
        handleGameOver(true);
      } else {
        setIsReady(true);
      }
    } else {
      // WRONG
      setCombo(0);
      const penalty = mode === '6' || mode === '8' || mode === '8-joker' ? 3 : 1;
      const newWrong = wrongCount + 1;
      setWrongCount(newWrong);
      setScore((s) => s - penalty);
      playSound('wrong', settings);

      if (settings.shakeEffect) {
        setShakingCardIndex(idx2);
        setTimeout(() => setShakingCardIndex(null), 500);
      }

      if (lifeLimit !== 'infinite') {
        const maxL = parseInt(lifeLimit);
        const remainLife = maxL - newWrong;
        if (remainLife <= 0) {
          showStatus('💔 기회를 모두 소진했습니다!', 'text-rose-400', 2000);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isFlipped: false } : c))
            );
            setFlippedCards([]);
            handleGameOver(false, 'life');
          }, 800);
          return;
        } else {
          showStatus(`틀렸습니다! 남은 기회: ${remainLife}번 (-${penalty}점)`, 'text-rose-400', 1500);
        }
      } else {
        showStatus(`틀렸습니다! (-${penalty}점)`, 'text-rose-400', 1500);
      }

      setTimeout(() => {
        setCards((prev) =>
          prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isFlipped: false } : c))
        );
        setFlippedCards([]);
        setIsReady(true);
      }, 1000);
    }
  };

  const remainLife = lifeLimit !== 'infinite' ? parseInt(lifeLimit) - wrongCount : null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-[var(--ui-space-lg)] w-full max-w-[620px] mx-auto animate-in fade-in duration-300 select-none">
      {/* Top Info HUD with standardized design tokens */}
      <div
        id="info-panel"
        className="arcade-hud-box mb-2.5"
      >
        {/* Left: Score & Combo & Life */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-black text-orange-400 tracking-wider uppercase">SCORE</div>
              <div id="score-count" className="text-base sm:text-lg font-mono font-black text-white leading-none">
                {score}점
              </div>
            </div>
          </div>

          {combo > 1 && (
            <div className="px-2 py-0.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 font-black text-[11px] sm:text-xs flex items-center gap-1 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-red-400" /> {combo} 콤보
            </div>
          )}

          {remainLife !== null && (
            <div
              className={`px-2 py-0.5 rounded-lg border font-bold text-[11px] sm:text-xs flex items-center gap-1 ${
                remainLife <= 2
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                  : 'bg-white/5 border-white/10 text-slate-300'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> {remainLife}
            </div>
          )}
        </div>

        {/* Right: Hint Items, Timer & Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!is8Normal && (
            <>
              <button
                id="hint-action-btn"
                onClick={handleUseFlashHint}
                disabled={!isReady || flashHints <= 0 || isGameOver}
                className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2 sm:px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-[11px] sm:text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span className="hidden sm:inline">플래시</span>
                <span className="px-1 rounded bg-black/30 text-[10px] font-mono">{flashHints}</span>
              </button>

              <button
                id="hint-card-btn"
                onClick={handleUseCardHint}
                disabled={!isReady || cardHints <= 0 || isGameOver}
                className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 px-2 sm:px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-[11px] sm:text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span className="hidden sm:inline">카드힌트</span>
                <span className="px-1 rounded bg-black/30 text-[10px] font-mono">{cardHints}</span>
              </button>
            </>
          )}

          {/* Timer Display */}
          <div
            id="timer-panel"
            className={`px-2.5 py-1 h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 rounded-xl bg-white/5 border border-white/10 font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5 min-w-[80px] justify-center ${
              is8Normal && timeRemaining <= 20.0
                ? 'text-rose-400 border-rose-500/50 animate-pulse'
                : 'text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{is8Normal ? timeRemaining.toFixed(1) : timeElapsed.toFixed(1)}s</span>
          </div>

          <button
            id="open-settings-btn"
            onClick={onOpenSettings}
            title="게임 설정"
            className="h-[var(--ui-btn-h-nav)] min-h-[44px] sm:min-h-0 w-[36px] sm:w-[34px] rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Notice Banner */}
      <div
        id="status-text"
        className={`w-full text-center py-1 text-xs sm:text-sm font-extrabold tracking-wide transition-all h-6 mb-1.5 ${statusColor}`}
      >
        {statusMsg}
      </div>

      {/* Game Board Grid Container - Enlarged by 20% and Centered */}
      <div className="flex items-center justify-center w-full max-w-[98vw] sm:max-w-[580px] md:max-w-[620px] aspect-square max-h-[calc(100vh-175px)]">
        <div
          id="board"
          className="memory-card-grid"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
            transform: `scale(${Math.max(1, (settings.cardScale / 100) * 1.05)})`,
            transition: 'transform 0.2s ease',
          }}
        >
          {cards.map((card, idx) => {
            const isFlipped = card.isFlipped || card.isMatched || card.isJokerRevealed;
            const isMatched = card.isMatched;
            const isSpecial = !!card.isSpecial;
            const isFlashing = card.isFlashing;
            const isShaking = shakingCardIndex === idx;

            const fruitColor = FRUIT_COLORS[card.value] || 'from-orange-500/20 to-amber-500/30 border-orange-500/40 text-orange-200';

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(idx)}
                className={`relative w-full h-full rounded-xl sm:rounded-2xl cursor-pointer perspective-1000 select-none ${
                  isShaking ? 'animate-bounce' : ''
                } ${isFlashing ? 'animate-pulse' : ''}`}
              >
                {/* 3D Inner Card */}
                <div
                  className={`w-full h-full rounded-xl sm:rounded-2xl transform-style-3d transition-all duration-300 flex items-center justify-center relative ${
                    isFlipped ? '[transform:rotateY(180deg)]' : ''
                  }`}
                >
                  {/* Card Back with Arcade Pattern */}
                  <div
                    className={`absolute inset-0 rounded-xl sm:rounded-2xl flex items-center justify-center backface-hidden shadow-md transition-all arcade-card-back hover:scale-[1.03] active:scale-95`}
                  >
                    <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-black/40 border border-orange-500/40 flex items-center justify-center text-[10px] sm:text-xs text-orange-400 font-black filter drop-shadow-[0_0_6px_rgba(255,122,0,0.6)]">
                      🕹️
                    </div>
                  </div>

                  {/* Card Front */}
                  <div
                    className={`absolute inset-0 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center backface-hidden [transform:rotateY(180deg)] border shadow-md transition-all ${
                      isMatched
                        ? 'arcade-card-matched'
                        : isSpecial
                        ? 'bg-gradient-to-br from-amber-200 to-yellow-300 border-yellow-400 text-slate-900 font-bold'
                        : card.value === '🃏'
                        ? 'bg-gradient-to-br from-purple-900 to-indigo-950 border-purple-400 text-purple-200'
                        : `bg-gradient-to-br ${fruitColor}`
                    }`}
                  >
                    <span
                      className={`leading-none select-none filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)] ${
                        gridSize === 4
                          ? 'text-4xl sm:text-6xl'
                          : gridSize === 6
                          ? 'text-3xl sm:text-5xl'
                          : 'text-2xl sm:text-3xl'
                      }`}
                    >
                      {card.value === '🃏HINT' ? '🃏' : card.value === '💡FLASH' ? '💡' : card.value}
                    </span>

                    {card.isSpecial && (
                      <span className="text-[8px] sm:text-[9px] font-black text-slate-800 tracking-tighter mt-0.5">
                        {card.isSpecial === 'card-hint' ? '카드힌트' : '플래시'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result Modal */}
      <MemoryResultModal
        isOpen={isGameOver}
        isWin={isWin}
        reason={failReason}
        score={score}
        maxCombo={maxCombo}
        timeElapsed={timeElapsed}
        mode={mode}
        onRetry={onRetry}
        onMenu={onMenu}
      />
    </div>
  );
};
