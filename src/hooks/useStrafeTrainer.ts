import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { RESULT_TICK_COUNT, TICK_MS } from "../lib/constants";
import { formatTime } from "../lib/format";
import {
  getKeyFromCode,
  getResultLabel,
  getSyncRate,
  sampleTickState,
} from "../lib/scoring";
import { createKeys, createStats, initialMotion } from "../lib/state";
import type {
  KeyName,
  KeyState,
  MotionState,
  TrainerActions,
  TrainerDerivedState,
  TrainerState,
  TrainingStats,
  TickResult,
} from "../lib/types";

export type UseStrafeTrainerResult = {
  actions: TrainerActions;
  derived: TrainerDerivedState;
  state: TrainerState;
  supportsPointerLock: boolean;
  trainerRef: RefObject<HTMLDivElement | null>;
};

export const useStrafeTrainer = (): UseStrafeTrainerResult => {
  const trainerRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<KeyState>(createKeys());
  const statsRef = useRef<TrainingStats>(createStats());
  const trainingRef = useRef(false);
  const lockedRef = useRef(false);
  const mouseWindowRef = useRef<number[]>([]);
  const mouseDeltaRef = useRef(0);
  const tickIndexRef = useRef(0);

  const [keys, setKeys] = useState<KeyState>(() => createKeys());
  const [stats, setStats] = useState<TrainingStats>(() => createStats());
  const [motion, setMotion] = useState<MotionState>(initialMotion);
  const [ticks, setTicks] = useState<TickResult[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [clock, setClock] = useState(() => performance.now());

  const supportsPointerLock = useMemo(
    () =>
      typeof document !== "undefined" &&
      "pointerLockElement" in document &&
      typeof HTMLElement !== "undefined" &&
      "requestPointerLock" in HTMLElement.prototype,
    [],
  );

  const setKeysState = useCallback((nextKeys: KeyState) => {
    keysRef.current = nextKeys;
    setKeys(nextKeys);
  }, []);

  const updateKeysState = useCallback((key: KeyName, pressed: boolean) => {
    const current = keysRef.current;

    if (current[key] === pressed) {
      return;
    }

    setKeysState({
      ...current,
      [key]: pressed,
    });
  }, [setKeysState]);

  const setStatsState = useCallback((nextStats: TrainingStats) => {
    statsRef.current = nextStats;
    setStats(nextStats);
  }, []);

  const finishTraining = useCallback((exitLock: boolean) => {
    const now = performance.now();
    trainingRef.current = false;
    mouseWindowRef.current = [];
    mouseDeltaRef.current = 0;
    setIsTraining(false);
    setClock(now);
    setMotion(initialMotion);
    setKeysState(createKeys());

    const currentStats = statsRef.current;

    if (currentStats.startedAt !== null && currentStats.endedAt === null) {
      setStatsState({
        ...currentStats,
        currentStreak: 0,
        endedAt: now,
      });
    }

    if (
      exitLock &&
      typeof document !== "undefined" &&
      document.pointerLockElement === trainerRef.current
    ) {
      document.exitPointerLock();
    }
  }, [setKeysState, setStatsState]);

  const startTraining = useCallback(() => {
    const element = trainerRef.current;

    if (!element || !supportsPointerLock) {
      return;
    }

    const now = performance.now();
    const freshStats = createStats(now);
    const locked = document.pointerLockElement === element;

    trainingRef.current = true;
    lockedRef.current = locked;
    mouseWindowRef.current = [];
    mouseDeltaRef.current = 0;
    tickIndexRef.current = 0;
    setTicks([]);
    setStatsState(freshStats);
    setKeysState(createKeys());
    setMotion(initialMotion);
    setIsTraining(true);
    setIsLocked(locked);
    setClock(now);

    try {
      const request = element.requestPointerLock() as Promise<void> | void;
      request?.catch(() => finishTraining(false));
    } catch {
      finishTraining(false);
    }
  }, [finishTraining, setKeysState, setStatsState, supportsPointerLock]);

  const resetTraining = useCallback(() => {
    trainingRef.current = false;
    lockedRef.current = false;
    mouseWindowRef.current = [];
    mouseDeltaRef.current = 0;
    tickIndexRef.current = 0;
    setTicks([]);
    setIsTraining(false);
    setIsLocked(false);
    setClock(performance.now());
    setKeysState(createKeys());
    setStatsState(createStats());
    setMotion(initialMotion);

    if (
      typeof document !== "undefined" &&
      document.pointerLockElement === trainerRef.current
    ) {
      document.exitPointerLock();
    }
  }, [setKeysState, setStatsState]);

  const stopTraining = useCallback(() => {
    finishTraining(true);
  }, [finishTraining]);

  const toggleTraining = useCallback(() => {
    if (trainingRef.current) {
      finishTraining(true);
    } else {
      startTraining();
    }
  }, [finishTraining, startTraining]);

  const sampleTick = useCallback((now: number) => {
    if (!trainingRef.current || !lockedRef.current) {
      return;
    }

    const rawDelta = mouseDeltaRef.current;
    mouseDeltaRef.current = 0;

    const nextTick = sampleTickState({
      keys: keysRef.current,
      mouseWindow: mouseWindowRef.current,
      now,
      rawDelta,
      stats: statsRef.current,
      tickIndex: tickIndexRef.current,
    });

    mouseWindowRef.current = nextTick.mouseWindow;
    tickIndexRef.current = nextTick.tick.tickIndex;
    setStatsState(nextTick.stats);
    setMotion(nextTick.motion);
    setTicks(previous =>
      previous.length >= RESULT_TICK_COUNT
        ? [...previous.slice(1), nextTick.tick]
        : [...previous, nextTick.tick],
    );
    setClock(now);
  }, [setStatsState]);

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === trainerRef.current;
      lockedRef.current = locked;
      setIsLocked(locked);

      if (locked) {
        return;
      }

      if (trainingRef.current) {
        finishTraining(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();

        if (!event.repeat) {
          toggleTraining();
        }

        return;
      }

      if (event.code === "KeyR") {
        event.preventDefault();

        if (statsRef.current.activeTicks > 0) {
          resetTraining();
        }

        return;
      }

      if (event.code === "Escape" && trainingRef.current) {
        event.preventDefault();
        finishTraining(true);
        return;
      }

      if (!trainingRef.current) {
        return;
      }

      const key = getKeyFromCode(event.code);

      if (!key) {
        return;
      }

      event.preventDefault();

      if (!event.repeat) {
        updateKeysState(key, true);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!trainingRef.current) {
        return;
      }

      const key = getKeyFromCode(event.code);

      if (!key) {
        return;
      }

      event.preventDefault();
      updateKeysState(key, false);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!trainingRef.current || !lockedRef.current) {
        return;
      }

      mouseDeltaRef.current += event.movementX;
    };

    const onBlur = () => {
      if (trainingRef.current) {
        finishTraining(true);
      }
    };

    document.addEventListener("pointerlockchange", onPointerLockChange);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("blur", onBlur);
    };
  }, [finishTraining, resetTraining, toggleTraining, updateKeysState]);

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

      scheduleNextTick();
    };

    scheduleNextTick();

    return () => window.clearTimeout(timeoutId);
  }, [isTraining, sampleTick]);

  const state = useMemo<TrainerState>(
    () => ({
      keys,
      stats,
      motion,
      ticks,
      isTraining,
      isLocked,
      clock,
    }),
    [clock, isLocked, isTraining, keys, motion, stats, ticks],
  );

  const derived = useMemo<TrainerDerivedState>(() => {
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
  }, [clock, isTraining, motion, stats]);

  const actions = useMemo<TrainerActions>(
    () => ({
      reset: resetTraining,
      start: startTraining,
      stop: stopTraining,
      toggle: toggleTraining,
    }),
    [resetTraining, startTraining, stopTraining, toggleTraining],
  );

  return {
    actions,
    derived,
    state,
    supportsPointerLock,
    trainerRef,
  };
};
