import { memo } from "react";
import { classNames } from "../lib/classNames";
import type { TrainerDerivedState, TrainerState } from "../lib/types";

type SessionOverviewProps = {
  derived: TrainerDerivedState;
  state: TrainerState;
};

export const SessionOverview = memo(function SessionOverview({
  derived,
  state,
}: SessionOverviewProps) {
  const statItems = [
    ["Streak", state.stats.currentStreak],
    ["Best", state.stats.bestStreak],
    ["Miss", state.stats.misses],
    ["Wrong", state.stats.wrongWay],
    ["Overlap", state.stats.overlaps],
    ["Ticks", state.stats.activeTicks],
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
