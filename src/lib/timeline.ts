import { RESULT_TICK_COUNT } from "../trainer/domain/constants";
import { getTickQuality } from "../trainer/domain/scoring";
import type { TickQuality, TickResult } from "../trainer/domain/types";

export type TickLane = "mouseLeft" | "mouseRight" | "a" | "d";

export type TickLaneQuality = TickQuality | "key-neutral";

export const tickLanes: Array<{ id: TickLane; label: string }> = [
  { id: "a", label: "A" },
  { id: "d", label: "D" },
  { id: "mouseLeft", label: "Mouse L" },
  { id: "mouseRight", label: "Mouse R" },
];

export type TimelineSlot = TickResult | null;

export type LaneRunEdges = {
  joinsNext: boolean;
  joinsPrevious: boolean;
};

export const createTimelineSlots = (ticks: TickResult[]) => {
  const visibleTicks = ticks.slice(-RESULT_TICK_COUNT);
  const emptySlots = Math.max(0, RESULT_TICK_COUNT - visibleTicks.length);

  return [
    ...Array.from({ length: emptySlots }, () => null),
    ...visibleTicks,
  ] satisfies TimelineSlot[];
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
  const tickQuality = getTickQuality(tick.direction, tick.keys);

  if (!laneActive) {
    return "neutral";
  }

  if (lane === "a") {
    if (tickQuality === "overlap") {
      return "overlap";
    }

    if (tick.direction === "left" && tickQuality === "sync") {
      return "sync";
    }

    if (tick.direction === "right" && tickQuality === "wrong") {
      return "wrong";
    }

    return "key-neutral";
  }

  if (lane === "d") {
    if (tickQuality === "overlap") {
      return "overlap";
    }

    if (tick.direction === "right" && tickQuality === "sync") {
      return "sync";
    }

    if (tick.direction === "left" && tickQuality === "wrong") {
      return "wrong";
    }

    return "key-neutral";
  }

  return tickQuality;
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
