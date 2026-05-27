import type { KeyState, MotionState, TrainerState, TrainingStats } from "./types";

export const createKeys = (): KeyState => ({
  a: false,
  d: false,
});

export const createStats = (): TrainingStats => ({
  syncedTicks: 0,
  misses: 0,
  wrongWay: 0,
  overlaps: 0,
});

export const initialMotion: MotionState = {
  direction: "neutral",
  quality: "neutral",
  smoothX: 0,
};

export const createTrainerState = (clock = 0): TrainerState => ({
  keys: createKeys(),
  stats: createStats(),
  motion: initialMotion,
  ticks: [],
  isTraining: false,
  isLocked: false,
  startedAt: null,
  clock,
});
