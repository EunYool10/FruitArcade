import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cardBackStyle } from '../../utils/shop';
import { Search, Zap } from 'lucide-react';
import { GameResult, GameReward, GameSettings, LifeLimit, MemoryCard, MemoryMode } from '../../types';
import { Tone } from '../../constants';
import { playSound } from '../../utils/audio';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { celebrate } from '../../utils/fx';
import { Rng, randomSeed, seededRandom } from '../../utils/rng';
import { formatTime } from '../../utils/format';
import { GameFrame, Hud, HudStat, ScreenOverlay } from '../game/GameFrame';
import { ResultCard } from '../game/ResultCard';
import { Emoji } from '../ui/Emoji';

const FRUITS = [
  '🍎', '🍊', '🍌', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝', '🍉',
  '🍈', '🍏', '🍋', '🍐', '🫐', '🥥', '🥭', '🥑', '🥦', '🍅',
  '🥕', '🌽', '🌶️', '🫑', '🥔', '🍆', '🌰', '🥜', '🍄', '🧅',
  '🧄', '🍠'
];

// Soft tint behind each card's emoji
const FRUIT_TINT: Record<string, string> = {
  '🍎': '#ff4d4f', '🍊': '#ff9f1c', '🍌': '#ffd23f', '🍇': '#9b5de5', '🍓': '#ff4778', '🍒': '#e5383b',
  '🍑': '#ffad80', '🍍': '#ffc53d', '🥝': '#8ac926', '🍉': '#2ec27e', '🍈': '#b5e48c', '🍏': '#7bd389',
  '🍋': '#ffe066', '🍐': '#c5e063', '🫐': '#4361ee', '🥥': '#a47148', '🥭': '#ffb627', '🥑': '#6a994e',
  '🥦': '#40916c', '🍅': '#ef476f', '🥕': '#f77f00', '🌽': '#ffd166', '🌶️': '#d00000', '🫑': '#38b000',
  '🥔': '#c9a66b', '🍆': '#7b2cbf', '🌰': '#8d5524', '🥜': '#d4a373', '🍄': '#e07a5f', '🧅': '#e5989b',
  '🧄': '#e9d8a6', '🍠': '#b5838d',
};

const STATUS_CLASS: Record<Tone, string> = {
  berry: 'bg-berry-soft text-berry-ink',
  melon: 'bg-melon-soft text-melon-ink',
  mango: 'bg-mango-soft text-mango-ink',
  grape: 'bg-grape-soft text-grape-ink',
  soda: 'bg-soda-soft text-soda-ink',
  peach: 'bg-peach-soft text-peach-ink',
};

export const MODE_LABEL: Record<MemoryMode, string> = {
  '4': '4×4',
  '6': '6×6',
  '8': '8×8 타임어택',
  '8-joker': '8×8 조커',
};

function shuffle<T>(arr: T[], rand: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  mode: MemoryMode;
  previewTime: number;
  lifeLimit: LifeLimit;
  settings: GameSettings;
  isPaused: boolean;
  onUnlockAchieve: (id: string) => void;
  onGameComplete: (result: GameResult) => GameReward;
  onRoundChange: (active: boolean) => void;
  onRetry: () => void;
  onChangeSetup: () => void;
  onExit: () => void;
  /** Same seed → same card layout (friend challenges) */
  seed?: string;
  onRoundSeed?: (seed: string) => void;
}

export const MemoryGameBoard: React.FC<Props> = ({
  mode,
  previewTime,
  lifeLimit,
  settings,
  isPaused,
  onUnlockAchieve,
  onGameComplete,
  onRoundChange,
  onRetry,
  onChangeSetup,
  onExit,
  seed,
  onRoundSeed,
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
  const [statusColor, setStatusColor] = useState<Tone>('mango');
  const [flashHints, setFlashHints] = useState(1);
  const [cardHints, setCardHints] = useState(1);
  const [hintUsed, setHintUsed] = useState(false);
  const [jokerStreak, setJokerStreak] = useState(0);
  const [maxJokerStreak, setMaxJokerStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWin, setIsWin] = useState(false);
  const [failReason, setFailReason] = useState<'time' | 'life' | 'quit' | undefined>(undefined);
  const [shakingCardIndex, setShakingCardIndex] = useState<number | null>(null);
  const [reward, setReward] = useState<GameReward | null>(null);
  // Time left (ms) to memorise the cards; counts down only while the game is not paused
  const [previewLeft, setPreviewLeft] = useState(previewTime);
  const previewDone = useRef(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoFlashTriggered = useRef(false);

  const is8Normal = mode === '8';
  const isJokerMode = mode === '8-joker';
  const gridSize = mode === '4' ? 4 : mode === '6' ? 6 : 8;

  const showStatus = useCallback((text: string, color: Tone, duration = 2000) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatusMsg(text);
    setStatusColor(color);
    statusTimerRef.current = setTimeout(() => {
      setStatusMsg('상큼하게 진행 중...');
      setStatusColor('melon');
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

    showStatus(`⭐ ${label}! (${pairsCount}쌍 반짝임)`, 'mango', 2000);

    setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isFlashing: false })));
    }, 1600);
  }, [showStatus]);

  // Init game board
  useEffect(() => {
    const roundSeed = seed ?? randomSeed();
    onRoundSeed?.(roundSeed);
    const rand = seededRandom(roundSeed);
    let cardValues: string[] = [];
    if (mode === '8-joker') {
      const selectedFruits = FRUITS.slice(0, 28);
      const jokers = Array(8).fill('🃏');
      cardValues = shuffle([...selectedFruits, ...selectedFruits, ...jokers], rand);
    } else if (mode === '8') {
      const selectedFruits = FRUITS.slice(0, 30);
      const base = shuffle([...selectedFruits, ...selectedFruits], rand);
      cardValues = shuffle([...base, '🃏HINT', '🃏HINT', '💡FLASH', '💡FLASH'], rand);
    } else {
      const num = parseInt(mode);
      const total = (num * num) / 2;
      const selectedFruits = FRUITS.slice(0, total);
      cardValues = shuffle([...selectedFruits, ...selectedFruits], rand);
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
    setStatusColor('mango');

    setPreviewLeft(previewTime);
    previewDone.current = false;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [mode, previewTime, is8Normal]);

  // Preview countdown (stops while paused)
  useEffect(() => {
    if (previewLeft <= 0 || isPaused) return;
    const id = setTimeout(() => setPreviewLeft((p) => Math.max(0, p - 100)), 100);
    return () => clearTimeout(id);
  }, [previewLeft, isPaused]);

  useEffect(() => {
    if (previewLeft > 0 || previewDone.current) return;
    previewDone.current = true;
    setCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
    setIsReady(true);
    setStatusMsg('상큼하게 진행 중...');
    setStatusColor('melon');
  }, [previewLeft]);

  // Main game timer
  useEffect(() => {
    if (!isReady || isGameOver || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => prev + 0.1);

      if (is8Normal) setTimeRemaining((prev) => Math.max(0, prev - 0.1));
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
      if (settings.celebrateEffect) celebrate();
    } else {
      playSound('over', settings);
      vibrate(HAPTIC.over, settings);
    }

  }, [settings]);

  // Runs after the final state update has rendered, so score/combo/time are never stale
  useEffect(() => {
    if (!isGameOver) return;
    checkAchievements(isWin, score, maxCombo, timeElapsed, wrongCount);
    setReward(onGameComplete({ game: 'memory', score, seconds: timeElapsed, won: isWin }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver]);

  useEffect(() => {
    onRoundChange(!isGameOver);
  }, [isGameOver, onRoundChange]);

  // Time attack: out of time
  useEffect(() => {
    if (is8Normal && previewDone.current && !isGameOver && timeRemaining <= 0) handleGameOver(false, 'time');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining]);

  // 6×6: one free flash hint after 8.5 seconds
  useEffect(() => {
    if (mode === '6' && !autoFlashTriggered.current && timeElapsed >= 8.5) {
      autoFlashTriggered.current = true;
      triggerFlash(2, '시스템 지원 힌트');
    }
  }, [timeElapsed, mode, triggerFlash]);

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
    showStatus('🃏 카드 힌트! 2초간 카드를 확인하세요!', 'soda', 2000);

    setTimeout(() => {
      setCards((prev) =>
        prev.map((c) => (c.id === target.id && !c.isMatched ? { ...c, isFlipped: false } : c))
      );
    }, 2000);
  };

  const hotkeys = useRef({ flash: () => {}, card: () => {} });
  hotkeys.current = { flash: handleUseFlashHint, card: handleUseCardHint };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isPaused || isGameOver || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'KeyH') hotkeys.current.flash();
      else if (e.code === 'KeyC') hotkeys.current.card();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPaused, isGameOver]);

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
    vibrate(HAPTIC.match, settings);

    const newJokerStreak = jokerStreak + 1;
    setJokerStreak(newJokerStreak);
    if (newJokerStreak > maxJokerStreak) setMaxJokerStreak(newJokerStreak);

    setScore((s) => s + 15);
    showStatus('🃏 조커 발동! 주변 카드가 3초간 노출됩니다! (+15점)', 'grape', 3000);

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
    vibrate(HAPTIC.match, settings);

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
        showStatus('🃏 카드힌트 발동! 2초간 카드를 확인하세요!', 'soda', 2000);

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

      // Combos pay extra: +2 per consecutive match after the first, up to +10
      const scoreGained = 10 + Math.min(10, (newCombo - 1) * 2);
      // Computed here (not inside a state updater) so achievements/hints never fire during render
      const prevScore = score;
      const nextScore = prevScore + scoreGained;
      setScore(nextScore);
      if (wrongCount === 0 && nextScore >= 100) onUnlockAchieve('perfect_100');

      playSound('match', settings);
      vibrate(HAPTIC.match, settings);
      if (newCombo >= 3 && newCombo % 3 === 0) {
        playSound('combo', settings);
        showStatus(`🔥 ${newCombo}연속 콤보 폭발! +${scoreGained}점 · 보너스 힌트!`, 'berry', 2000);
        setTimeout(() => triggerFlash(1, '콤보 보너스 힌트'), 400);
      } else if (newCombo > 1) {
        playSound('combo', settings);
        showStatus(`🔥 ${newCombo}연속 콤보! (+${scoreGained}점)`, 'mango', 1500);
      } else {
        showStatus('맞췄습니다! (+10점)', 'melon', 1200);
      }

      // Guard Hunter: every 30 points → +1 flash hint (this message wins over the match message)
      if (!is8Normal && Math.floor(nextScore / 30) > Math.floor(prevScore / 30)) {
        setFlashHints((h) => h + 1);
        showStatus('🛡️ 가드헌터 발동! 플래시 힌트 +1 획득!', 'soda', 2200);
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
      vibrate(HAPTIC.wrong, settings);

      if (settings.shakeEffect) {
        setShakingCardIndex(idx2);
        setTimeout(() => setShakingCardIndex(null), 500);
      }

      if (lifeLimit !== 'infinite') {
        const maxL = parseInt(lifeLimit);
        const remainLife = maxL - newWrong;
        if (remainLife <= 0) {
          showStatus('💔 기회를 모두 소진했습니다!', 'berry', 2000);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) => (i === idx1 || i === idx2 ? { ...c, isFlipped: false } : c))
            );
            setFlippedCards([]);
            handleGameOver(false, 'life');
          }, 800);
          return;
        } else {
          showStatus(`틀렸습니다! 남은 기회: ${remainLife}번 (-${penalty}점)`, 'berry', 1500);
        }
      } else {
        showStatus(`틀렸습니다! (-${penalty}점)`, 'berry', 1500);
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

  const remainLife = lifeLimit !== 'infinite' ? Math.max(0, parseInt(lifeLimit) - wrongCount) : null;
  const lowTime = is8Normal && timeRemaining <= 20;
  const scale = settings.cardScale / 100;

  // Size everything by grid density
  const emojiSize = gridSize === 4 ? 'text-4xl sm:text-6xl' : gridSize === 6 ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-3xl';
  const markSize = gridSize === 4 ? 'text-2xl sm:text-4xl' : gridSize === 6 ? 'text-lg sm:text-2xl' : 'text-xs sm:text-lg';
  const back = cardBackStyle(settings.cardBack ?? '');
  const gap = gridSize === 8 ? 'gap-1 sm:gap-1.5' : 'gap-1.5 sm:gap-2.5';
  const radius = gridSize === 8 ? 'rounded-lg sm:rounded-xl' : 'rounded-xl sm:rounded-2xl';
  const border = settings.highContrast ? 'border-[3px]' : 'border-2';

  const resultTitle = isWin ? 'CLEAR!' : failReason === 'time' ? 'TIME OVER' : 'GAME OVER';
  const resultEmoji = isWin ? '🎉' : failReason === 'time' ? '⏰' : '💔';
  const resultSub = isWin ? '모든 짝을 찾았어요!' : failReason === 'time' ? '시간이 다 됐어요' : '목숨을 모두 썼어요';

  return (
    <>
      <GameFrame
        hud={
          <Hud
            footer={
              <p
                role="status"
                className={`mt-2.5 truncate rounded-xl border-2 border-line px-3 py-1.5 text-center text-sm font-bold ${STATUS_CLASS[statusColor]}`}
              >
                {previewLeft > 0 ? `👀 카드를 기억하세요! ${(previewLeft / 1000).toFixed(1)}초` : statusMsg}
              </p>
            }
          >
            <HudStat label="점수" value={score} />
            <HudStat
              label="콤보"
              value={combo > 1 ? `${combo}🔥` : '–'}
              tone={combo > 1 && settings.comboEffect ? 'hot' : 'default'}
            />
            <HudStat
              label={is8Normal ? '남은 시간' : '시간'}
              value={is8Normal ? formatTime(timeRemaining, lowTime) : formatTime(timeElapsed)}
              tone={lowTime ? 'warn' : 'default'}
            />
            <HudStat
              label="목숨"
              value={remainLife === null ? '∞' : `♥${remainLife}`}
              tone={remainLife !== null && remainLife <= 2 ? 'warn' : 'default'}
            />
          </Hud>
        }
        board={
          <div className="board-fit w-full" style={{ maxWidth: `calc((100dvh - var(--board-offset)) * ${scale})` }}>
            <div
              id="board"
              className={`grid aspect-square w-full rounded-[26px] border-2 border-line bg-surface-2 p-2 shadow-pop sm:p-3 ${gap}`}
              style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
            >
              {cards.map((card, idx) => {
                const isFlipped = card.isFlipped || card.isMatched || card.isJokerRevealed;
                const isJoker = card.value === '🃏';
                const display = card.value === '🃏HINT' ? '🃏' : card.value === '💡FLASH' ? '💡' : card.value;
                const frontBg = card.isMatched ? 'bg-melon-soft' : card.isSpecial ? 'bg-mango' : isJoker ? 'bg-grape' : 'bg-surface';
                const tint = !card.isMatched && !card.isSpecial && !isJoker ? FRUIT_TINT[card.value] : undefined;

                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleCardClick(idx)}
                    aria-label={isFlipped ? `${idx + 1}번 카드: ${display}` : `${idx + 1}번 카드`}
                    className={`card-3d relative aspect-square w-full ${radius} ${
                      shakingCardIndex === idx ? 'animate-shake' : ''
                    } ${card.isFlashing ? 'card-flash' : ''} ${isFlipped ? '' : 'transition-transform hover:-translate-y-0.5'}`}
                  >
                    <div
                      className={`card-inner ${settings.animEnabled ? 'transition-transform duration-300' : ''} ${
                        isFlipped ? 'card-flipped' : ''
                      }`}
                    >
                      {/* Back */}
                      <div className={`card-face grid place-items-center ${radius} ${border} border-line shadow-hard-sm ${back.className}`}>
                        <span
                          className={`grid aspect-square w-[48%] place-items-center rounded-full border-2 border-line bg-surface font-display leading-none text-ink ${markSize}`}
                        >
                          <Emoji e={back.mark} />
                        </span>
                      </div>
                      {/* Front */}
                      <div
                        className={`card-face card-front grid place-items-center ${radius} ${border} border-line ${frontBg}`}
                        style={tint ? { backgroundColor: `color-mix(in srgb, ${tint} 24%, var(--surface))` } : undefined}
                      >
                        <span className={`leading-none ${emojiSize} ${card.isMatched ? 'opacity-60' : ''}`}>
                          <Emoji e={display} />
                        </span>
                        {card.isSpecial && (
                          <span className="absolute bottom-0.5 text-[8px] font-black text-on-bright sm:text-[10px]">
                            {card.isSpecial === 'card-hint' ? '카드힌트' : '플래시'}
                          </span>
                        )}
                        {card.isMatched && (
                          <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-line bg-melon text-[9px] font-black text-on-bright sm:h-5 sm:w-5 sm:text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        }
        panel={
          <div className="panel space-y-3 p-4">
            {!is8Normal ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="btn btn-melon px-2"
                  onClick={handleUseFlashHint}
                  disabled={!isReady || flashHints <= 0 || isGameOver}
                  aria-label={`플래시 힌트 ${flashHints}개 남음 (H)`}
                >
                  <Zap className="h-4 w-4" strokeWidth={2.5} /> 플래시
                  <span className="rounded-md bg-on-bright/15 px-1.5 text-sm tabular-nums">{flashHints}</span>
                  <span className="kbd hidden lg:inline-block">H</span>
                </button>
                <button
                  type="button"
                  className="btn btn-soda px-2"
                  onClick={handleUseCardHint}
                  disabled={!isReady || cardHints <= 0 || isGameOver}
                  aria-label={`카드 힌트 ${cardHints}개 남음 (C)`}
                >
                  <Search className="h-4 w-4" strokeWidth={2.5} /> 카드
                  <span className="rounded-md bg-on-bright/15 px-1.5 text-sm tabular-nums">{cardHints}</span>
                  <span className="kbd hidden lg:inline-block">C</span>
                </button>
              </div>
            ) : (
              <p className="well px-3 py-2.5 text-sm text-ink-2">
                💡 숨어 있는 특수 카드(🃏 카드힌트 · 💡 플래시)를 뒤집으면 힌트가 발동해요.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              <span className="chip bg-berry-soft">{MODE_LABEL[mode]}</span>
              <span className="chip bg-surface-2">👀 {previewTime / 1000}초</span>
              <span className="chip bg-surface-2">♥ {lifeLimit === 'infinite' ? '무제한' : `${lifeLimit}번`}</span>
            </div>
          </div>
        }
      />

      {isGameOver && (
        <ScreenOverlay>
          <ResultCard
            game="memory"
            emoji={resultEmoji}
            title={resultTitle}
            subtitle={resultSub}
            tone={isWin ? 'melon' : 'berry'}
            score={score}
            stats={[
              { label: '최대 콤보', value: `${maxCombo}연속` },
              { label: '걸린 시간', value: formatTime(timeElapsed) },
              { label: '실수', value: `${wrongCount}번` },
              { label: '모드', value: MODE_LABEL[mode] },
            ]}
            reward={reward}
            shareText={`🍓 과일 메모리 ${MODE_LABEL[mode]} ${isWin ? '클리어!' : '도전!'} ${score}점`}
            onRetry={onRetry}
            onExit={onExit}
            extraAction={{ label: '설정 변경', onClick: onChangeSetup }}
          />
        </ScreenOverlay>
      )}
    </>
  );
};
