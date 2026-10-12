import { DashDifficulty, MemoryMode } from '../types';

export const MEMORY_LABEL: Record<MemoryMode, string> = {
  '4': '4×4',
  '6': '6×6',
  '8': '8×8 타임어택',
  '8-joker': '8×8 조커',
};

export const DASH_LABEL: Record<DashDifficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' };
