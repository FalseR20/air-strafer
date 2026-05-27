import { memo, useMemo } from "react";
import { classNames } from "../lib/classNames";
import { qualityLabels, RESULT_TICK_COUNT } from "../lib/constants";
import { formatSeconds } from "../lib/format";
import {
  createTimelineSlots,
  getLaneActive,
  getLaneQuality,
  getLaneSymbol,
  tickLanes,
  type TickLane,
} from "../lib/timeline";
import type { TickResult } from "../lib/types";

type TickTimelineProps = {
  ticks: TickResult[];
};

type TickCellProps = {
  index: number;
  lane: { id: TickLane; label: string };
  tick: TickResult | null;
};

const TickCell = memo(function TickCell({ index, lane, tick }: TickCellProps) {
  const laneQuality = tick ? getLaneQuality(lane.id, tick) : "neutral";
  const symbol = tick ? getLaneSymbol(lane.id, tick) : "·";
  const tooltip = tick
    ? `${lane.label} | Tick ${tick.tickIndex} | ${qualityLabels[tick.quality]} | ${tick.detail} | A:${tick.a ? "on" : "off"} D:${tick.d ? "on" : "off"} | ${formatSeconds(tick.sessionMs)}`
    : `${lane.label} | Waiting for tick`;

  return (
    <div
      aria-label={tooltip}
      className={classNames(
        "tick-cell",
        tick && getLaneActive(lane.id, tick) && "active",
        `tick-${laneQuality}`,
      )}
      role="img"
      tabIndex={0}
      title={tooltip}
    >
      {symbol}
    </div>
  );
}, areTickCellsEqual);

function areTickCellsEqual(previous: TickCellProps, next: TickCellProps) {
  return (
    previous.index === next.index &&
    previous.lane.id === next.lane.id &&
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
                  key={tick ? `${lane.id}-${tick.id}` : `${lane.id}-empty-${index}`}
                  lane={lane}
                  tick={tick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="strip-legend" aria-label="Result strip legend">
        <span><b className="legend-sync">•</b> sync</span>
        <span><b className="legend-miss">M</b> no key</span>
        <span><b className="legend-wrong">X</b> wrong</span>
        <span><b className="legend-overlap">O</b> overlap</span>
        <span><b className="legend-neutral">·</b> neutral</span>
      </div>
    </section>
  );
});
