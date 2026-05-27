import { DEADZONE, MOUSE_WINDOW, TICK_MS } from "./constants";
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
  now: number;
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

export const getSyncRate = (stats: TrainingStats) => {
  if (stats.activeTicks === 0) {
    return 0;
  }

  return Math.round((stats.syncedTicks / stats.activeTicks) * 100);
};

export const getResultLabel = (stats: TrainingStats) => {
  if (stats.activeTicks === 0) {
    return "No Samples";
  }

  const syncRate = getSyncRate(stats);
  const overlapRate = stats.overlaps / stats.activeTicks;
  const wrongRate = stats.wrongWay / stats.activeTicks;
  const missRate = stats.misses / stats.activeTicks;

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

export const getTickSymbol = (quality: TickQuality) => {
  switch (quality) {
    case "sync":
      return "•";
    case "miss":
      return "M";
    case "wrong":
      return "X";
    case "overlap":
      return "O";
    case "neutral":
      return "·";
  }
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

const getTickQuality = (direction: Direction, keys: KeyState): TickQuality => {
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
  now,
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
  const activeTick = direction !== "neutral";
  const syncedTick = quality === "sync";
  const nextStreak = activeTick
    ? syncedTick
      ? stats.currentStreak + 1
      : 0
    : stats.currentStreak;

  const nextStats: TrainingStats = {
    ...stats,
    activeTicks: stats.activeTicks + (activeTick ? 1 : 0),
    syncedTicks: stats.syncedTicks + (syncedTick ? 1 : 0),
    misses: stats.misses + (quality === "miss" ? 1 : 0),
    wrongWay: stats.wrongWay + (quality === "wrong" ? 1 : 0),
    overlaps: stats.overlaps + (quality === "overlap" ? 1 : 0),
    currentStreak: nextStreak,
    bestStreak: Math.max(stats.bestStreak, nextStreak),
    activeMs: stats.activeMs + (activeTick ? TICK_MS : 0),
  };

  const nextTickIndex = tickIndex + 1;
  const sessionMs = stats.startedAt ? now - stats.startedAt : 0;
  const tick: TickResult = {
    id: nextTickIndex,
    tickIndex: nextTickIndex,
    direction,
    quality,
    symbol: getTickSymbol(quality),
    detail: getTickDetail(quality, direction),
    a: keys.a,
    d: keys.d,
    sessionMs,
    smoothX,
  };

  return {
    motion: {
      direction,
      intensity: Math.min(100, Math.abs(smoothX) * 16),
      quality,
      smoothX,
    },
    mouseWindow: nextMouseWindow,
    stats: nextStats,
    tick,
  };
};
