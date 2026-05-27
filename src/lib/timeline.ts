import { RESULT_TICK_COUNT } from "./constants";
import type { TickQuality, TickResult } from "./types";

export type TickLane = "mouseLeft" | "mouseRight" | "a" | "d";

export type TickLaneQuality = TickQuality | "key-neutral";

export const tickLanes: Array<{ id: TickLane; label: string }> = [
  { id: "mouseLeft", label: "Mouse L" },
  { id: "mouseRight", label: "Mouse R" },
  { id: "a", label: "A" },
  { id: "d", label: "D" },
];

export const createTimelineSlots = (ticks: TickResult[]) => {
  const visibleTicks = ticks.slice(-RESULT_TICK_COUNT);
  const emptySlots = Math.max(0, RESULT_TICK_COUNT - visibleTicks.length);

  return [
    ...Array.from({ length: emptySlots }, () => null),
    ...visibleTicks,
  ] satisfies Array<TickResult | null>;
};

export const getLaneActive = (lane: TickLane, tick: TickResult) => {
  switch (lane) {
    case "mouseLeft":
      return tick.direction === "left";
    case "mouseRight":
      return tick.direction === "right";
    case "a":
      return tick.a;
    case "d":
      return tick.d;
  }
};

export const getLaneSymbol = (lane: TickLane, tick: TickResult) => {
  switch (lane) {
    case "mouseLeft":
      return tick.direction === "left" ? tick.symbol : "·";
    case "mouseRight":
      return tick.direction === "right" ? tick.symbol : "·";
    case "a":
      return tick.a ? "A" : "·";
    case "d":
      return tick.d ? "D" : "·";
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

  if (lane === "a") {
    if (tick.quality === "overlap") {
      return "overlap";
    }

    if (tick.direction === "left" && tick.quality === "sync") {
      return "sync";
    }

    if (tick.direction === "right" && tick.quality === "wrong") {
      return "wrong";
    }

    return "key-neutral";
  }

  if (lane === "d") {
    if (tick.quality === "overlap") {
      return "overlap";
    }

    if (tick.direction === "right" && tick.quality === "sync") {
      return "sync";
    }

    if (tick.direction === "left" && tick.quality === "wrong") {
      return "wrong";
    }

    return "key-neutral";
  }

  return tick.quality;
};
