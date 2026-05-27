import { memo } from "react";
import { qualityLabels } from "../trainer/domain/constants";
import type { KeyState, MotionState } from "../trainer/domain/types";
import { KeycapPair } from "./KeycapPair";

type InputMeterProps = {
  barWidth: number;
  keys: KeyState;
  motion: MotionState;
};

export const InputMeter = memo(function InputMeter({
  barWidth,
  keys,
  motion,
}: InputMeterProps) {
  const leftWidth = motion.direction === "left" ? `${barWidth}%` : "0%";
  const rightWidth = motion.direction === "right" ? `${barWidth}%` : "0%";

  return (
    <div className="input-panel">
      <div className="mouse-track" aria-label="Horizontal mouse movement">
        <div className="track-axis" />
        <div className="mouse-fill mouse-fill-left" style={{ width: leftWidth }} />
        <div className="mouse-fill mouse-fill-right" style={{ width: rightWidth }} />
        <div className="track-center" />
      </div>

      <div className="mouse-support-row">
        <div className="motion-state">{qualityLabels[motion.quality]}</div>
        <KeycapPair keys={keys} motion={motion} />
        <div className="motion-delta">
          {Math.abs(motion.smoothX).toFixed(1)} dx/tick
        </div>
      </div>
    </div>
  );
});
