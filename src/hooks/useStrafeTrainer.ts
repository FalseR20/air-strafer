import { useMemo, useRef, type RefObject } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTrainerStore } from "../trainer/application/trainerStore";
import { getTrainerDerivedState } from "../trainer/domain/selectors";
import type {
  TrainerActions,
  TrainerDerivedState,
  TrainerState,
} from "../trainer/domain/types";
import { useTrainerRuntime } from "../trainer/infrastructure/useTrainerRuntime";

export type UseStrafeTrainerResult = {
  actions: TrainerActions;
  derived: TrainerDerivedState;
  state: TrainerState;
  supportsPointerLock: boolean;
  trainerRef: RefObject<HTMLDivElement | null>;
};

const selectTrainerState = ({
  clock,
  isLocked,
  isTraining,
  keys,
  motion,
  stats,
  ticks,
}: TrainerState): TrainerState => ({
  clock,
  isLocked,
  isTraining,
  keys,
  motion,
  stats,
  ticks,
});

export const useStrafeTrainer = (): UseStrafeTrainerResult => {
  const trainerRef = useRef<HTMLDivElement>(null);
  const state = useTrainerStore(useShallow(selectTrainerState));
  const derived = useTrainerStore(
    useShallow((store) => getTrainerDerivedState(store)),
  );

  const supportsPointerLock = useMemo(
    () =>
      typeof document !== "undefined" &&
      "pointerLockElement" in document &&
      typeof HTMLElement !== "undefined" &&
      "requestPointerLock" in HTMLElement.prototype,
    [],
  );

  const actions = useTrainerRuntime({
    supportsPointerLock,
    trainerRef,
  });

  return {
    actions,
    derived,
    state,
    supportsPointerLock,
    trainerRef,
  };
};
