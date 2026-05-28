import { useCallback, useEffect, useRef, type RefObject } from "react";
import { JUMP_TICK_COUNT, TICK_MS } from "../domain/constants";
import { createKeys } from "../domain/initialState";
import {
  getKeyFromCode,
  sampleTickState,
} from "../domain/scoring";
import type { TrainerActions } from "../domain/types";
import { useTrainerStore } from "../application/trainerStore";

type UseTrainerRuntimeOptions = {
  supportsPointerLock: boolean;
  trainerRef: RefObject<HTMLDivElement | null>;
};

type RuntimeBuffers = {
  mouseDelta: number;
  mouseWindow: number[];
  tickIndex: number;
};

const createRuntimeBuffers = (): RuntimeBuffers => ({
  mouseDelta: 0,
  mouseWindow: [],
  tickIndex: 0,
});

export const useTrainerRuntime = ({
  supportsPointerLock,
  trainerRef,
}: UseTrainerRuntimeOptions): TrainerActions => {
  const runtimeRef = useRef<RuntimeBuffers>(createRuntimeBuffers());
  const movementKeysRef = useRef(createKeys());
  const isJumping = useTrainerStore((state) => state.isJumping);
  const isTraining = useTrainerStore((state) => state.isTraining);
  const startedAt = useTrainerStore((state) => state.startedAt);

  const resetRuntimeBuffers = useCallback(() => {
    runtimeRef.current = createRuntimeBuffers();
  }, []);

  const finishTraining = useCallback((exitLock: boolean) => {
    const now = performance.now();
    resetRuntimeBuffers();
    useTrainerStore.getState().finishSession(now);

    if (
      exitLock &&
      typeof document !== "undefined" &&
      document.pointerLockElement === trainerRef.current
    ) {
      document.exitPointerLock();
    }
  }, [resetRuntimeBuffers, trainerRef]);

  const startPractice = useCallback(() => {
    const element = trainerRef.current;

    if (!element || !supportsPointerLock) {
      return;
    }

    const now = performance.now();
    const locked = document.pointerLockElement === element;

    resetRuntimeBuffers();
    useTrainerStore.getState().startPractice(now, locked, {
      ...movementKeysRef.current,
    });

    try {
      if (!locked) {
        const request = element.requestPointerLock() as Promise<void> | void;
        request?.catch(() => finishTraining(false));
      }
    } catch {
      finishTraining(false);
    }
  }, [finishTraining, resetRuntimeBuffers, supportsPointerLock, trainerRef]);

  const stopTraining = useCallback(() => {
    finishTraining(true);
  }, [finishTraining]);

  const startJump = useCallback(() => {
    const element = trainerRef.current;

    if (!element || !supportsPointerLock) {
      return;
    }

    const state = useTrainerStore.getState();

    if (state.isTraining) {
      return;
    }

    const now = performance.now();
    const locked = document.pointerLockElement === element;

    resetRuntimeBuffers();
    state.startJump(now, locked, {
      ...movementKeysRef.current,
    });

    try {
      if (!locked) {
        const request = element.requestPointerLock() as Promise<void> | void;
        request?.catch(() => finishTraining(false));
      }
    } catch {
      finishTraining(false);
    }
  }, [
    finishTraining,
    resetRuntimeBuffers,
    supportsPointerLock,
    trainerRef,
  ]);

  const toggleTraining = useCallback(() => {
    const state = useTrainerStore.getState();

    if (state.isJumping) {
      return;
    }

    if (state.isTraining) {
      finishTraining(true);
    } else {
      startPractice();
    }
  }, [finishTraining, startPractice]);

  const sampleTick = useCallback((now: number) => {
    const state = useTrainerStore.getState();

    if (!state.isTraining || !state.isLocked) {
      return;
    }

    const runtime = runtimeRef.current;
    const rawDelta = runtime.mouseDelta;
    runtime.mouseDelta = 0;

    const nextTick = sampleTickState({
      keys: state.keys,
      mouseWindow: runtime.mouseWindow,
      rawDelta,
      stats: state.stats,
      tickIndex: runtime.tickIndex,
    });

    runtime.mouseWindow = nextTick.mouseWindow;
    runtime.tickIndex = nextTick.tick.tickIndex;
    useTrainerStore.getState().commitTick(nextTick, now);

    if (state.isJumping && nextTick.tick.tickIndex >= JUMP_TICK_COUNT) {
      finishTraining(true);
    }
  }, [finishTraining]);

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === trainerRef.current;
      const store = useTrainerStore.getState();

      store.setPointerLocked(locked);

      if (!locked && store.isTraining) {
        finishTraining(false);
      }
    };

    const onPointerLockError = () => {
      const locked = document.pointerLockElement === trainerRef.current;
      const store = useTrainerStore.getState();

      store.setPointerLocked(locked);

      if (!locked && store.isTraining) {
        finishTraining(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const store = useTrainerStore.getState();

      if (event.code === "KeyP") {
        event.preventDefault();

        if (!event.repeat) {
          toggleTraining();
        }

        return;
      }

      if (event.code === "Space") {
        event.preventDefault();

        if (!event.repeat) {
          startJump();
        }

        return;
      }

      if (event.code === "Escape" && store.isTraining) {
        event.preventDefault();
        finishTraining(true);
        return;
      }

      const key = getKeyFromCode(event.code);

      if (!key) {
        return;
      }

      event.preventDefault();

      if (!event.repeat) {
        movementKeysRef.current[key] = true;
        store.setKeyPressed(key, true);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const store = useTrainerStore.getState();

      const key = getKeyFromCode(event.code);

      if (!key) {
        return;
      }

      event.preventDefault();
      movementKeysRef.current[key] = false;
      store.setKeyPressed(key, false);
    };

    const onMouseMove = (event: MouseEvent) => {
      const store = useTrainerStore.getState();

      if (!store.isTraining || !store.isLocked) {
        return;
      }

      runtimeRef.current.mouseDelta += event.movementX;
    };

    const onBlur = () => {
      const store = useTrainerStore.getState();

      movementKeysRef.current = createKeys();
      store.setKeyPressed("a", false);
      store.setKeyPressed("d", false);

      if (store.isTraining) {
        finishTraining(true);
      }
    };

    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("blur", onBlur);
    };
  }, [finishTraining, startJump, toggleTraining, trainerRef]);

  useEffect(() => {
    if (!isTraining) {
      return;
    }

    let timeoutId = 0;
    let nextTickAt = performance.now() + TICK_MS;

    const scheduleNextTick = () => {
      timeoutId = window.setTimeout(
        runTick,
        Math.max(0, nextTickAt - performance.now()),
      );
    };

    const runTick = () => {
      const now = performance.now();
      sampleTick(now);
      nextTickAt += TICK_MS;

      if (now - nextTickAt > TICK_MS * 4) {
        nextTickAt = now + TICK_MS;
      }

      if (useTrainerStore.getState().isTraining) {
        scheduleNextTick();
      }
    };

    scheduleNextTick();

    return () => window.clearTimeout(timeoutId);
  }, [isTraining, sampleTick, startedAt]);

  return {
    jump: startJump,
    start: startPractice,
    stop: stopTraining,
    toggle: toggleTraining,
  };
};
