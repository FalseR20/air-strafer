import { RESULT_TICK_COUNT } from "../trainer/domain/constants";
import type { Direction, KeyName, TickResult } from "../trainer/domain/types";

export type TickLane = "mouseLeft" | "mouseRight" | "a" | "d";

export type TickLaneQuality =
  | "mouse"
  | "sync"
  | "wrong"
  | "neutral"
  | "key-neutral";

export const tickLanes: Array<{ id: TickLane; label: string }> = [
  { id: "mouseLeft", label: "Mouse L" },
  { id: "mouseRight", label: "Mouse R" },
  { id: "a", label: "A" },
  { id: "d", label: "D" },
];

export type TimelineSlot = TickResult | null;

export type LaneRunEdges = {
  joinsNext: boolean;
  joinsPrevious: boolean;
};

export const createTimelineSlots = (ticks: TickResult[]) => {
  const latestTick = ticks.at(-1);
  const currentPage = latestTick
    ? Math.floor((latestTick.tickIndex - 1) / RESULT_TICK_COUNT)
    : 0;
  const slots = Array.from<TimelineSlot>({ length: RESULT_TICK_COUNT }).fill(
    null,
  );

  for (const tick of ticks) {
    const tickPage = Math.floor((tick.tickIndex - 1) / RESULT_TICK_COUNT);

    if (tickPage === currentPage) {
      slots[(tick.tickIndex - 1) % RESULT_TICK_COUNT] = tick;
    }
  }

  return slots;
};

export const getLaneActive = (lane: TickLane, tick: TickResult) => {
  switch (lane) {
    case "mouseLeft":
      return tick.direction === "left";
    case "mouseRight":
      return tick.direction === "right";
    case "a":
      return tick.keys.a;
    case "d":
      return tick.keys.d;
  }
};

export const getLaneQuality = (
  lane: TickLane,
  tick: TickResult,
): TickLaneQuality => {
  const laneActive = getLaneActive(lane, tick);

  if (!laneActive) {
    return "neutral";
  }

  if (lane === "mouseLeft" || lane === "mouseRight") {
    const expectedKey = getExpectedKey(tick.direction);
    const wrongKey = getWrongKey(tick.direction);

    if (wrongKey && tick.keys[wrongKey]) {
      return "mouse";
    }

    return expectedKey && tick.keys[expectedKey] ? "sync" : "mouse";
  }

  if (tick.direction === "neutral") {
    return "key-neutral";
  }

  return lane === getExpectedKey(tick.direction) ? "sync" : "wrong";
};

export const getExpectedKey = (direction: Direction): KeyName | null => {
  switch (direction) {
    case "left":
      return "a";
    case "right":
      return "d";
    case "neutral":
      return null;
  }
};

export const getWrongKey = (direction: Direction): KeyName | null => {
  switch (direction) {
    case "left":
      return "d";
    case "right":
      return "a";
    case "neutral":
      return null;
  }
};

export const startsStrafe = (slots: TimelineSlot[], index: number) => {
  const currentDirection = slots[index]?.direction ?? "neutral";
  let previousDirection: Direction = "neutral";

  for (let slotIndex = index - 1; slotIndex >= 0; slotIndex -= 1) {
    const direction = slots[slotIndex]?.direction ?? "neutral";

    if (direction !== "neutral") {
      previousDirection = direction;
      break;
    }
  }

  return (
    currentDirection !== "neutral" &&
    previousDirection !== "neutral" &&
    currentDirection !== previousDirection
  );
};

const canJoinTicks = (
  lane: TickLane,
  currentTick: TimelineSlot,
  adjacentTick: TimelineSlot,
) => {
  if (!currentTick || !adjacentTick) {
    return false;
  }

  if (!getLaneActive(lane, currentTick) || !getLaneActive(lane, adjacentTick)) {
    return false;
  }

  return getLaneQuality(lane, currentTick) === getLaneQuality(lane, adjacentTick);
};

export const getLaneRunEdges = (
  lane: TickLane,
  slots: TimelineSlot[],
  index: number,
): LaneRunEdges => {
  const currentTick = slots[index] ?? null;

  return {
    joinsPrevious: canJoinTicks(lane, currentTick, slots[index - 1] ?? null),
    joinsNext: canJoinTicks(lane, currentTick, slots[index + 1] ?? null),
  };
};
