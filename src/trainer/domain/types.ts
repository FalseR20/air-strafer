export type Direction = "left" | "right" | "neutral";

export type TickQuality = "sync" | "miss" | "wrong" | "overlap" | "neutral";

export type KeyState = {
  a: boolean;
  d: boolean;
};

export type KeyName = keyof KeyState;

export type TrainingStats = {
  syncedTicks: number;
  misses: number;
  wrongWay: number;
  overlaps: number;
};

export type MotionState = {
  direction: Direction;
  quality: TickQuality;
  smoothX: number;
};

export type TickResult = {
  tickIndex: number;
  direction: Direction;
  keys: KeyState;
};

export type TrainerState = {
  keys: KeyState;
  stats: TrainingStats;
  motion: MotionState;
  ticks: TickResult[];
  isTraining: boolean;
  isLocked: boolean;
  startedAt: number | null;
  clock: number;
};

export type TrainerSessionState = "Live result" | "Last summary" | "Ready";

export type TrainerDerivedState = {
  activeTime: string;
  barWidth: number;
  hasResults: boolean;
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
