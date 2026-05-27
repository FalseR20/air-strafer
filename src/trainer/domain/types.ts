export type Direction = "left" | "right" | "neutral";

export type TickQuality = "sync" | "miss" | "wrong" | "overlap" | "neutral";

export type KeyState = {
  a: boolean;
  d: boolean;
};

export type KeyName = keyof KeyState;

export type TrainingStats = {
  activeTicks: number;
  syncedTicks: number;
  misses: number;
  wrongWay: number;
  overlaps: number;
  currentStreak: number;
  bestStreak: number;
  activeMs: number;
  startedAt: number | null;
  endedAt: number | null;
};

export type MotionState = {
  direction: Direction;
  intensity: number;
  quality: TickQuality;
  smoothX: number;
};

export type TickResult = {
  id: number;
  tickIndex: number;
  direction: Direction;
  quality: TickQuality;
  symbol: string;
  detail: string;
  a: boolean;
  d: boolean;
  sessionMs: number;
  smoothX: number;
};

export type TrainerState = {
  keys: KeyState;
  stats: TrainingStats;
  motion: MotionState;
  ticks: TickResult[];
  isTraining: boolean;
  isLocked: boolean;
  clock: number;
};

export type TrainerSessionState = "Live result" | "Last summary" | "Ready";

export type TrainerDerivedState = {
  activeTime: string;
  barWidth: number;
  durationMs: number;
  hasResults: boolean;
  isActiveMotion: boolean;
  resultLabel: string;
  sessionState: TrainerSessionState;
  sessionTime: string;
  syncRate: number;
};

export type TrainerActions = {
  reset: () => void;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};
