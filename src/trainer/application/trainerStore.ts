import { create } from "zustand";
import { RESULT_TICK_COUNT } from "../domain/constants";
import {
  createKeys,
  createStats,
  createTrainerState,
  initialMotion,
} from "../domain/initialState";
import type { TickSampleResult } from "../domain/scoring";
import type { KeyName, KeyState, TrainerState } from "../domain/types";

export type TrainerStoreActions = {
  commitTick: (sample: TickSampleResult, now: number) => void;
  finishSession: (now: number) => void;
  setKeyPressed: (key: KeyName, pressed: boolean) => void;
  setPointerLocked: (locked: boolean) => void;
  startJump: (now: number, locked: boolean, keys: KeyState) => void;
  startPractice: (now: number, locked: boolean, keys: KeyState) => void;
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
            isJumping: false,
            isTraining: false,
            keys: createKeys(),
            motion: initialMotion,
          }
        : state,
    ),

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

  startJump: (now, locked, keys) =>
    set({
      ...createTrainerState(now),
      keys: { ...keys },
      isJumping: true,
      isLocked: locked,
      isTraining: true,
      startedAt: now,
      stats: createStats(),
    }),

  startPractice: (now, locked, keys) =>
    set({
      ...createTrainerState(now),
      keys: { ...keys },
      isLocked: locked,
      isTraining: true,
      startedAt: now,
      stats: createStats(),
    }),
}));
