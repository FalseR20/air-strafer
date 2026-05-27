import type { KeyState, MotionState, TrainingStats } from "./types";

export const createKeys = (): KeyState => ({
  a: false,
  d: false,
});

export const createStats = (startedAt: number | null = null): TrainingStats => ({
  activeTicks: 0,
  syncedTicks: 0,
  misses: 0,
  wrongWay: 0,
  overlaps: 0,
  currentStreak: 0,
  bestStreak: 0,
  activeMs: 0,
  startedAt,
  endedAt: null,
});

export const initialMotion: MotionState = {
  direction: "neutral",
  intensity: 0,
  quality: "neutral",
  smoothX: 0,
};
