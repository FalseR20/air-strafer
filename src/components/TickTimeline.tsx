import { memo, useMemo } from "react";
import { classNames } from "../lib/classNames";
import { formatSeconds } from "../lib/format";
import {
  qualityLabels,
  RESULT_TICK_COUNT,
  TICK_MS,
} from "../trainer/domain/constants";
import { getTickDetail, getTickQuality } from "../trainer/domain/scoring";
import {
  createTimelineSlots,
  getLaneActive,
  getLaneQuality,
  getLaneRunEdges,
  tickLanes,
  type TickLane,
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

const TickCell = memo(function TickCell({
  index,
  lane,
  slots,
  tick,
}: TickCellProps) {
  const laneQuality = tick ? getLaneQuality(lane.id, tick) : "neutral";
  const laneActive = tick ? getLaneActive(lane.id, tick) : false;
  const tickQuality = tick ? getTickQuality(tick.direction, tick.keys) : "neutral";
  const { joinsNext, joinsPrevious } = getLaneRunEdges(lane.id, slots, index);
  const tooltip = tick
    ? [
        lane.label,
        `Tick ${tick.tickIndex}`,
        qualityLabels[tickQuality],
        getTickDetail(tickQuality, tick.direction),
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
        <span><b className="legend-swatch legend-sync" /> synced</span>
        <span><b className="legend-swatch legend-miss" /> missing key</span>
        <span><b className="legend-swatch legend-wrong" /> opposite key</span>
        <span><b className="legend-swatch legend-overlap" /> A+D overlap</span>
        <span><b className="legend-swatch legend-key-neutral" /> key only</span>
        <span><b className="legend-swatch legend-neutral" /> idle</span>
      </div>
    </section>
  );
});
