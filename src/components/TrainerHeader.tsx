import { memo } from "react";
import type { TrainerActions } from "../lib/types";

type TrainerHeaderProps = {
  actions: TrainerActions;
  hasResults: boolean;
  isTraining: boolean;
};

export const TrainerHeader = memo(function TrainerHeader({
  actions,
  hasResults,
  isTraining,
}: TrainerHeaderProps) {
  return (
    <header className="trainer-header">
      <div className="brand-lockup">
        <p className="eyebrow">CS2 64 tick sync trainer</p>
        <h1>Air Strafer</h1>
      </div>

      <div className="controls" aria-label="Training controls">
        <button type="button" onClick={actions.toggle}>
          <span>{isTraining ? "Stop" : "Start"}</span>
          <kbd>Space</kbd>
        </button>
        <button type="button" onClick={actions.reset} disabled={!hasResults}>
          <span>Reset</span>
          <kbd>R</kbd>
        </button>
      </div>
    </header>
  );
});
