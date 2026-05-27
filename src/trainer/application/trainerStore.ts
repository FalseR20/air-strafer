import { create } from "zustand";
import { RESULT_TICK_COUNT } from "../domain/constants";
import {
  createKeys,
  createStats,
  createTrainerState,
  initialMotion,
} from "../domain/initialState";
import type { TickSampleResult } from "../domain/scoring";
import type { KeyName, TrainerState } from "../domain/types";

export type TrainerStoreActions = {
  commitTick: (sample: TickSampleResult, now: number) => void;
  finishSession: (now: number) => void;
  resetSession: (now: number) => void;
  setKeyPressed: (key: KeyName, pressed: boolean) => void;
  setPointerLocked: (locked: boolean) => void;
  startSession: (now: number, locked: boolean) => void;
};

export type TrainerStore = TrainerState & TrainerStoreActions;

const getInitialClock = () =>
  typeof performance === "undefined" ? 0 : performance.now();

export const useTrainerStore = create<TrainerStore>()((set) => ({
  ...createTrainerState(getInitialClock()),

  commitTick: (sample, now) =>
    set((state) => ({
      clock: now,
      motion: sample.motion,
      stats: sample.stats,
      ticks:
        state.ticks.length >= RESULT_TICK_COUNT
          ? [...state.ticks.slice(1), sample.tick]
          : [...state.ticks, sample.tick],
    })),

  finishSession: (now) =>
    set((state) =>
      state.isTraining
        ? {
            clock: now,
            isTraining: false,
            keys: createKeys(),
            motion: initialMotion,
          }
        : state,
    ),

  resetSession: (now) =>
    set({
      ...createTrainerState(now),
    }),

  setKeyPressed: (key, pressed) =>
    set((state) =>
      state.keys[key] === pressed
        ? state
        : {
            keys: {
              ...state.keys,
              [key]: pressed,
            },
          },
    ),

  setPointerLocked: (locked) =>
    set({
      isLocked: locked,
    }),

  startSession: (now, locked) =>
    set({
      ...createTrainerState(now),
      isLocked: locked,
      isTraining: true,
      startedAt: now,
      stats: createStats(),
    }),
}));
