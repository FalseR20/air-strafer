import { formatTime } from "../../lib/format";
import { getResultLabel, getSyncRate } from "./scoring";
import type { TrainerDerivedState, TrainerState } from "./types";

export const getTrainerDerivedState = ({
  clock,
  isTraining,
  motion,
  stats,
}: TrainerState): TrainerDerivedState => {
  const hasResults = stats.activeTicks > 0;
  const durationMs =
    stats.startedAt !== null ? (stats.endedAt ?? clock) - stats.startedAt : 0;
  const barWidth = Math.min(
    48,
    Math.max(motion.intensity * 0.48, motion.direction === "neutral" ? 0 : 4),
  );

  return {
    activeTime: formatTime(stats.activeMs),
    barWidth,
    durationMs,
    hasResults,
    isActiveMotion: motion.direction !== "neutral",
    resultLabel: hasResults ? getResultLabel(stats) : "",
    sessionState: isTraining ? "Live result" : hasResults ? "Last summary" : "Ready",
    sessionTime: formatTime(durationMs),
    syncRate: getSyncRate(stats),
  };
};
