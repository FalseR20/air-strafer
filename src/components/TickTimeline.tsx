import { memo, useMemo } from "react";
import { classNames } from "../lib/classNames";
import { formatSeconds } from "../lib/format";
import { RESULT_TICK_COUNT, TICK_MS } from "../trainer/domain/constants";
import {
  createTimelineSlots,
  getExpectedKey,
  getLaneActive,
  getLaneQuality,
  getLaneRunEdges,
  getWrongKey,
  startsStrafe,
  tickLanes,
  type TickLane,
  type TickLaneQuality,
  type TimelineSlot,
} from "../lib/timeline";
import type { TickResult } from "../trainer/domain/types";

type TickTimelineProps = {
  ticks: TickResult[];
};

type TickCellProps = {
  index: number;
  lane: { id: TickLane; label: string };
  slots: TimelineSlot[];
  tick: TimelineSlot;
};

const laneQualityLabels: Record<TickLaneQuality, string> = {
  "key-neutral": "Key only",
  mouse: "Movement without key",
  neutral: "Idle",
  sync: "Correct",
  wrong: "Wrong key",
};

const getLaneDetail = (
  lane: TickLane,
  tick: TickResult,
  laneQuality: TickLaneQuality,
) => {
  if (lane === "mouseLeft" || lane === "mouseRight") {
    const expectedKey = getExpectedKey(tick.direction)?.toUpperCase();
    const wrongKey = getWrongKey(tick.direction);

    if (laneQuality === "sync") {
      return `Synced mouse ${tick.direction} movement`;
    }

    if (laneQuality === "mouse") {
      if (wrongKey && tick.keys[wrongKey]) {
        return `Mouse ${tick.direction} with wrong key pressed`;
      }

      return tick.keys.a || tick.keys.d
        ? `Mouse ${tick.direction} without ${expectedKey} held`
        : `Mouse ${tick.direction} movement without key`;
    }

    return "Idle";
  }

  if (laneQuality === "key-neutral") {
    return "Key pressed without mouse movement";
  }

  if (laneQuality === "wrong") {
    return `Expected ${getExpectedKey(tick.direction)?.toUpperCase()} for mouse ${tick.direction}`;
  }

  if (laneQuality === "sync") {
    return `Correct ${lane.toUpperCase()} key for mouse ${tick.direction}`;
  }

  return tick.direction === "neutral" ? "Idle" : "No key input";
};

const TickCell = memo(function TickCell({
  index,
  lane,
  slots,
  tick,
}: TickCellProps) {
  const laneQuality = tick ? getLaneQuality(lane.id, tick) : "neutral";
  const laneActive = tick ? getLaneActive(lane.id, tick) : false;
  const { joinsNext, joinsPrevious } = getLaneRunEdges(lane.id, slots, index);
  const strafeDivider = startsStrafe(slots, index);
  const tooltip = tick
    ? [
        lane.label,
        `Tick ${tick.tickIndex}`,
        laneQualityLabels[laneQuality],
        getLaneDetail(lane.id, tick, laneQuality),
        `A:${tick.keys.a ? "on" : "off"} D:${tick.keys.d ? "on" : "off"}`,
        formatSeconds(tick.tickIndex * TICK_MS),
      ].join(" | ")
    : `${lane.label} | Waiting for tick`;

  return (
    <div
      aria-label={tooltip}
      className={classNames(
        "tick-cell",
        laneActive && "active",
        joinsPrevious && "join-previous",
        joinsNext && "join-next",
        strafeDivider && "strafe-divider",
        `tick-${laneQuality}`,
      )}
      role="img"
      tabIndex={0}
      title={tooltip}
    />
  );
}, areTickCellsEqual);

function areTickCellsEqual(previous: TickCellProps, next: TickCellProps) {
  return (
    previous.index === next.index &&
    previous.lane.id === next.lane.id &&
    previous.slots === next.slots &&
    previous.tick === next.tick
  );
}

export const TickTimeline = memo(function TickTimeline({ ticks }: TickTimelineProps) {
  const slots = useMemo(() => createTimelineSlots(ticks), [ticks]);

  return (
    <section className="tick-timeline-panel" aria-label="64 tick input timeline">
      <div className="strip-heading">
        <span>Tick timeline</span>
        <strong>4 lanes / {RESULT_TICK_COUNT} ticks</strong>
      </div>

      <div className="tick-timeline">
        {tickLanes.map(lane => (
          <div className="tick-lane" key={lane.id}>
            <div className="tick-lane-label">{lane.label}</div>
            <div className="tick-lane-cells">
              {slots.map((tick, index) => (
                <TickCell
                  index={index}
                  key={
                    tick
                      ? `${lane.id}-${tick.tickIndex}`
                      : `${lane.id}-empty-${index}`
                  }
                  lane={lane}
                  slots={slots}
                  tick={tick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="strip-legend" aria-label="Result strip legend">
        <span><b className="legend-swatch legend-sync" /> synced movement / correct key</span>
        <span><b className="legend-swatch legend-mouse" /> movement no key</span>
        <span><b className="legend-swatch legend-wrong" /> wrong key</span>
        <span><b className="legend-swatch legend-key-neutral" /> key only</span>
        <span><b className="legend-swatch legend-neutral" /> idle</span>
        <span><b className="legend-divider" /> strafe change</span>
      </div>
    </section>
  );
});
