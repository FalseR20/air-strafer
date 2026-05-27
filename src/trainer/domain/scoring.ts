import { DEADZONE, MOUSE_WINDOW } from "./constants";
import type {
  Direction,
  KeyName,
  KeyState,
  MotionState,
  TickQuality,
  TickResult,
  TrainingStats,
} from "./types";

export type TickSampleInput = {
  keys: KeyState;
  mouseWindow: number[];
  rawDelta: number;
  stats: TrainingStats;
  tickIndex: number;
};

export type TickSampleResult = {
  motion: MotionState;
  mouseWindow: number[];
  stats: TrainingStats;
  tick: TickResult;
};

export const getKeyFromCode = (code: string): KeyName | null => {
  switch (code) {
    case "KeyA":
      return "a";
    case "KeyD":
      return "d";
    default:
      return null;
  }
};

export const getDirection = (smoothX: number): Direction => {
  if (smoothX < -DEADZONE) {
    return "left";
  }

  if (smoothX > DEADZONE) {
    return "right";
  }

  return "neutral";
};

export const getActiveTicks = (stats: TrainingStats) =>
  stats.syncedTicks + stats.misses + stats.wrongWay + stats.overlaps;

export const getSyncRate = (stats: TrainingStats) => {
  const activeTicks = getActiveTicks(stats);

  if (activeTicks === 0) {
    return 0;
  }

  return Math.round((stats.syncedTicks / activeTicks) * 100);
};

export const getResultLabel = (stats: TrainingStats) => {
  const activeTicks = getActiveTicks(stats);

  if (activeTicks === 0) {
    return "No Samples";
  }

  const syncRate = getSyncRate(stats);
  const overlapRate = stats.overlaps / activeTicks;
  const wrongRate = stats.wrongWay / activeTicks;
  const missRate = stats.misses / activeTicks;

  if (overlapRate > 0.12) {
    return "Too Much Overlap";
  }

  if (wrongRate > 0.12) {
    return "Wrong Key";
  }

  if (missRate > 0.18) {
    return "Late";
  }

  if (syncRate >= 95) {
    return "Perfect";
  }

  if (syncRate >= 82) {
    return "Good";
  }

  return "Needs Sync";
};

export const getTickDetail = (quality: TickQuality, direction: Direction) => {
  switch (quality) {
    case "sync":
      return direction === "left" ? "Mouse left + A" : "Mouse right + D";
    case "miss":
      return "Mouse movement without A/D input";
    case "wrong":
      return `Mouse ${direction} with the opposite strafe key`;
    case "overlap":
      return "A and D held together";
    case "neutral":
      return "Neutral tick";
  }
};

export const getTickQuality = (
  direction: Direction,
  keys: KeyState,
): TickQuality => {
  if (direction === "neutral") {
    return "neutral";
  }

  const hasOverlap = keys.a && keys.d;
  const expectedKey = direction === "left" ? "a" : "d";
  const oppositeKey = direction === "left" ? "d" : "a";
  const hasExpectedKey = keys[expectedKey];
  const hasOppositeKey = keys[oppositeKey];

  if (hasOverlap) {
    return "overlap";
  }

  if (!hasExpectedKey && !hasOppositeKey) {
    return "miss";
  }

  if (!hasExpectedKey && hasOppositeKey) {
    return "wrong";
  }

  return "sync";
};

export const sampleTickState = ({
  keys,
  mouseWindow,
  rawDelta,
  stats,
  tickIndex,
}: TickSampleInput): TickSampleResult => {
  const nextMouseWindow = [...mouseWindow, rawDelta].slice(-MOUSE_WINDOW);
  const smoothX =
    nextMouseWindow.reduce((total, value) => total + value, 0) /
    nextMouseWindow.length;
  const direction = getDirection(smoothX);
  const quality = getTickQuality(direction, keys);
  const syncedTick = quality === "sync";

  const nextStats: TrainingStats = {
    ...stats,
    syncedTicks: stats.syncedTicks + (syncedTick ? 1 : 0),
    misses: stats.misses + (quality === "miss" ? 1 : 0),
    wrongWay: stats.wrongWay + (quality === "wrong" ? 1 : 0),
    overlaps: stats.overlaps + (quality === "overlap" ? 1 : 0),
  };

  const nextTickIndex = tickIndex + 1;
  const tick: TickResult = {
    tickIndex: nextTickIndex,
    direction,
    keys: { ...keys },
  };

  return {
    motion: {
      direction,
      quality,
      smoothX,
    },
    mouseWindow: nextMouseWindow,
    stats: nextStats,
    tick,
  };
};
