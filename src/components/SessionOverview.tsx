import { memo } from "react";
import { classNames } from "../lib/classNames";
import { getActiveTicks } from "../trainer/domain/scoring";
import type { TrainerDerivedState, TrainerState } from "../trainer/domain/types";

type SessionOverviewProps = {
  derived: TrainerDerivedState;
  state: TrainerState;
};

export const SessionOverview = memo(function SessionOverview({
  derived,
  state,
}: SessionOverviewProps) {
  const statItems = [
    ["Miss", state.stats.misses],
    ["Wrong", state.stats.wrongWay],
    ["Overlap", state.stats.overlaps],
    ["Ticks", getActiveTicks(state.stats)],
    ["Active", derived.activeTime],
    ["Session", derived.sessionTime],
  ] as const;

  return (
    <div className="stats-panel">
      <div className="result-summary">
        <div className="result-heading">
          <span className="session-state">
            <span className={classNames("status-dot", state.isLocked && "on")} />
            <span>{derived.sessionState}</span>
          </span>
          {derived.resultLabel && <strong>{derived.resultLabel}</strong>}
        </div>

        <div className="sync-score">
          <span>{derived.syncRate}</span>
          <small>% sync</small>
        </div>
      </div>

      <div className="stats-grid">
        {statItems.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
});
