import { memo } from "react";
import type { TrainerActions } from "../trainer/domain/types";

type TrainerHeaderProps = {
  actions: TrainerActions;
  isJumping: boolean;
  isTraining: boolean;
};

export const TrainerHeader = memo(function TrainerHeader({
  actions,
  isJumping,
  isTraining,
}: TrainerHeaderProps) {
  return (
    <header className="trainer-header">
      <div className="brand-lockup">
        <p className="eyebrow">CS2 64 tick sync trainer</p>
        <h1>Air Strafer</h1>
      </div>

      <div className="controls" aria-label="Training controls">
        <button
          type="button"
          onClick={actions.jump}
          disabled={isTraining}
        >
          <span>{isJumping ? "Jumping" : "Jump"}</span>
          <kbd>Space</kbd>
          <kbd>W Release</kbd>
        </button>
        <button type="button" onClick={actions.toggle} disabled={isJumping}>
          <span>{isTraining && !isJumping ? "Stop" : "Practice"}</span>
          <kbd>P</kbd>
        </button>
      </div>
    </header>
  );
});
