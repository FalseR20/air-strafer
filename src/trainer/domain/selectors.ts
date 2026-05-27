import { formatTime } from "../../lib/format";
import { TICK_MS } from "./constants";
import { getActiveTicks, getResultLabel, getSyncRate } from "./scoring";
import type { TrainerDerivedState, TrainerState } from "./types";

export const getTrainerDerivedState = ({
  clock,
  isJumping,
  isTraining,
  motion,
  startedAt,
  stats,
  ticks,
}: TrainerState): TrainerDerivedState => {
  const activeTicks = getActiveTicks(stats);
  const hasResults = activeTicks > 0 || ticks.length > 0;
  const durationMs = startedAt !== null ? clock - startedAt : 0;
  const motionIntensity = Math.min(100, Math.abs(motion.smoothX) * 16);
  const barWidth = Math.min(
    48,
    Math.max(motionIntensity * 0.48, motion.direction === "neutral" ? 0 : 4),
  );

  return {
    activeTime: formatTime(activeTicks * TICK_MS),
    barWidth,
    hasResults,
    resultLabel: hasResults ? getResultLabel(stats) : "",
    sessionState: isJumping
      ? "Jump attempt"
      : isTraining
        ? "Practice ready"
        : hasResults
          ? "Last summary"
          : "Ready",
    sessionTime: formatTime(durationMs),
    syncRate: getSyncRate(stats),
  };
};
