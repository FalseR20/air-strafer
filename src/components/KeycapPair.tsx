import { memo } from "react";
import { classNames } from "../lib/classNames";
import type { KeyName, KeyState, MotionState } from "../lib/types";

type KeycapPairProps = {
  keys: KeyState;
  motion: MotionState;
};

const getKeycapClass = (key: KeyName, keys: KeyState, motion: MotionState) => {
  const pressed = keys[key];
  const isActiveMotion = motion.direction !== "neutral";
  const isExpected = motion.direction === "left" ? key === "a" : key === "d";
  const isOpposite = motion.direction === "left" ? key === "d" : key === "a";
  const hasSinglePrimaryKey = keys.a !== keys.d;
  const isBad =
    pressed && isActiveMotion && ((keys.a && keys.d) || isOpposite);
  const isGood =
    pressed &&
    isActiveMotion &&
    isExpected &&
    hasSinglePrimaryKey &&
    motion.quality === "sync";

  return classNames(
    "keycap",
    "keycap-compact",
    pressed && "pressed",
    isGood && "good",
    isBad && "bad",
  );
};

export const KeycapPair = memo(function KeycapPair({
  keys,
  motion,
}: KeycapPairProps) {
  return (
    <div className="mini-keys" aria-label="Movement keys">
      <div className={getKeycapClass("a", keys, motion)}>A</div>
      <div className={getKeycapClass("d", keys, motion)}>D</div>
    </div>
  );
});
