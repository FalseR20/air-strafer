import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

type Direction = "left" | "right" | "neutral";
type SampleQuality = "sync" | "miss" | "wrong" | "overlap" | "forward" | "neutral";

type KeyState = {
  a: boolean;
  d: boolean;
  w: boolean;
  s: boolean;
  space: boolean;
};

type TrainingStats = {
  activeSamples: number;
  syncedSamples: number;
  misses: number;
  wrongWay: number;
  overlaps: number;
  forwardPenalties: number;
  currentStreak: number;
  bestStreak: number;
  activeMs: number;
  startedAt: number | null;
  endedAt: number | null;
};

type MotionState = {
  direction: Direction;
  intensity: number;
  quality: SampleQuality;
  smoothX: number;
};

const DEADZONE = 1.6;
const MOUSE_WINDOW = 8;
const ACTIVE_GAP_CAP_MS = 120;

const createKeys = (): KeyState => ({
  a: false,
  d: false,
  w: false,
  s: false,
  space: false,
});

const createStats = (startedAt: number | null = null): TrainingStats => ({
  activeSamples: 0,
  syncedSamples: 0,
  misses: 0,
  wrongWay: 0,
  overlaps: 0,
  forwardPenalties: 0,
  currentStreak: 0,
  bestStreak: 0,
  activeMs: 0,
  startedAt,
  endedAt: null,
});

const initialMotion: MotionState = {
  direction: "neutral",
  intensity: 0,
  quality: "neutral",
  smoothX: 0,
};

const qualityLabels: Record<SampleQuality, string> = {
  sync: "Synced",
  miss: "No key",
  wrong: "Wrong key",
  overlap: "Overlap",
  forward: "Release W/S",
  neutral: "Neutral",
};

const classNames = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

const getKeyFromCode = (code: string): keyof KeyState | null => {
  switch (code) {
    case "KeyA":
      return "a";
    case "KeyD":
      return "d";
    case "KeyW":
      return "w";
    case "KeyS":
      return "s";
    case "Space":
      return "space";
    default:
      return null;
  }
};

const getDirection = (smoothX: number): Direction => {
  if (smoothX < -DEADZONE) {
    return "left";
  }

  if (smoothX > DEADZONE) {
    return "right";
  }

  return "neutral";
};

const getSyncRate = (stats: TrainingStats) => {
  if (stats.activeSamples === 0) {
    return 0;
  }

  return Math.round((stats.syncedSamples / stats.activeSamples) * 100);
};

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const getResultLabel = (stats: TrainingStats) => {
  if (stats.activeSamples === 0) {
    return "No Samples";
  }

  const syncRate = getSyncRate(stats);
  const overlapRate = stats.overlaps / stats.activeSamples;
  const wrongRate = stats.wrongWay / stats.activeSamples;
  const missRate = stats.misses / stats.activeSamples;
  const forwardRate = stats.forwardPenalties / stats.activeSamples;

  if (overlapRate > 0.12) {
    return "Too Much Overlap";
  }

  if (wrongRate > 0.12) {
    return "Wrong Key";
  }

  if (missRate > 0.18) {
    return "Late";
  }

  if (forwardRate > 0.12) {
    return "Release W/S";
  }

  if (syncRate >= 95) {
    return "Perfect";
  }

  if (syncRate >= 82) {
    return "Good";
  }

  return "Needs Sync";
};

export function App() {
  const trainerRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<KeyState>(createKeys());
  const statsRef = useRef<TrainingStats>(createStats());
  const trainingRef = useRef(false);
  const lockedRef = useRef(false);
  const mouseWindowRef = useRef<number[]>([]);
  const lastActiveAtRef = useRef<number | null>(null);

  const [keys, setKeys] = useState<KeyState>(() => createKeys());
  const [stats, setStats] = useState<TrainingStats>(() => createStats());
  const [motion, setMotion] = useState<MotionState>(initialMotion);
  const [isTraining, setIsTraining] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [clock, setClock] = useState(() => performance.now());

  const supportsPointerLock =
    typeof document !== "undefined" &&
    "pointerLockElement" in document &&
    typeof HTMLElement !== "undefined" &&
    "requestPointerLock" in HTMLElement.prototype;

  const setKeysState = useCallback((nextKeys: KeyState) => {
    keysRef.current = nextKeys;
    setKeys(nextKeys);
  }, []);

  const updateKeysState = useCallback((key: keyof KeyState, pressed: boolean) => {
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

  const finishTraining = useCallback((nextStatus: string, exitLock: boolean) => {
    const now = performance.now();
    trainingRef.current = false;
    lastActiveAtRef.current = null;
    mouseWindowRef.current = [];
    setIsTraining(false);
    setClock(now);
    setStatus(nextStatus);
    setMotion(initialMotion);
    setKeysState(createKeys());

    const currentStats = statsRef.current;

    if (currentStats.startedAt && !currentStats.endedAt) {
      setStatsState({
        ...currentStats,
        currentStreak: 0,
        endedAt: now,
      });
    }

    if (exitLock && document.pointerLockElement === trainerRef.current) {
      document.exitPointerLock();
    }
  }, [setKeysState, setStatsState]);

  const startTraining = useCallback(() => {
    const element = trainerRef.current;

    if (!element || !supportsPointerLock) {
      setStatus("Pointer lock unavailable");
      return;
    }

    const now = performance.now();
    const freshStats = createStats(now);

    trainingRef.current = true;
    lockedRef.current = document.pointerLockElement === element;
    lastActiveAtRef.current = null;
    mouseWindowRef.current = [];
    setStatsState(freshStats);
    setKeysState(createKeys());
    setMotion(initialMotion);
    setIsTraining(true);
    setClock(now);
    setStatus("Capturing");

    try {
      const request = element.requestPointerLock();

      if (request instanceof Promise) {
        request.catch(() => finishTraining("Pointer lock denied", false));
      }
    } catch {
      finishTraining("Pointer lock denied", false);
    }
  }, [finishTraining, setKeysState, setStatsState, supportsPointerLock]);

  const resetTraining = useCallback(() => {
    trainingRef.current = false;
    lockedRef.current = false;
    lastActiveAtRef.current = null;
    mouseWindowRef.current = [];
    setIsTraining(false);
    setIsLocked(false);
    setStatus("Ready");
    setClock(performance.now());
    setKeysState(createKeys());
    setStatsState(createStats());
    setMotion(initialMotion);

    if (document.pointerLockElement === trainerRef.current) {
      document.exitPointerLock();
    }
  }, [setKeysState, setStatsState]);

  const processMouseMovement = useCallback((movementX: number, now: number) => {
    const windowValues = mouseWindowRef.current;
    windowValues.push(movementX);

    if (windowValues.length > MOUSE_WINDOW) {
      windowValues.shift();
    }

    const smoothX =
      windowValues.reduce((total, value) => total + value, 0) / windowValues.length;
    const direction = getDirection(smoothX);
    const intensity = Math.min(100, Math.abs(smoothX) * 14);

    if (direction === "neutral") {
      setMotion({
        direction,
        intensity: 0,
        quality: "neutral",
        smoothX,
      });
      return;
    }

    const currentKeys = keysRef.current;
    const hasForwardPenalty = currentKeys.w || currentKeys.s;
    const hasOverlap = currentKeys.a && currentKeys.d;
    const expectedKey = direction === "left" ? "a" : "d";
    const oppositeKey = direction === "left" ? "d" : "a";
    const hasExpectedKey = currentKeys[expectedKey];
    const hasOppositeKey = currentKeys[oppositeKey];

    let quality: SampleQuality = "sync";

    if (hasOverlap) {
      quality = "overlap";
    } else if (!hasExpectedKey && !hasOppositeKey) {
      quality = "miss";
    } else if (!hasExpectedKey && hasOppositeKey) {
      quality = "wrong";
    } else if (hasForwardPenalty) {
      quality = "forward";
    }

    const lastActiveAt = lastActiveAtRef.current;
    const activeDelta = lastActiveAt
      ? Math.min(Math.max(now - lastActiveAt, 0), ACTIVE_GAP_CAP_MS)
      : 16;
    lastActiveAtRef.current = now;

    const currentStats = statsRef.current;
    const isSynced = quality === "sync";
    const nextStreak = isSynced ? currentStats.currentStreak + 1 : 0;
    const nextStats: TrainingStats = {
      ...currentStats,
      activeSamples: currentStats.activeSamples + 1,
      syncedSamples: currentStats.syncedSamples + (isSynced ? 1 : 0),
      misses: currentStats.misses + (quality === "miss" ? 1 : 0),
      wrongWay: currentStats.wrongWay + (quality === "wrong" ? 1 : 0),
      overlaps: currentStats.overlaps + (quality === "overlap" ? 1 : 0),
      forwardPenalties:
        currentStats.forwardPenalties + (quality === "forward" ? 1 : 0),
      currentStreak: nextStreak,
      bestStreak: Math.max(currentStats.bestStreak, nextStreak),
      activeMs: currentStats.activeMs + activeDelta,
    };

    setStatsState(nextStats);
    setMotion({
      direction,
      intensity,
      quality,
      smoothX,
    });
  }, [setStatsState]);

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === trainerRef.current;
      lockedRef.current = locked;
      setIsLocked(locked);

      if (locked) {
        if (trainingRef.current) {
          setStatus("Capturing");
        }
        return;
      }

      if (trainingRef.current) {
        finishTraining("Pointer lock lost", false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && trainingRef.current) {
        event.preventDefault();
        finishTraining("Ready", true);
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

      processMouseMovement(event.movementX, performance.now());
    };

    const onBlur = () => {
      if (trainingRef.current) {
        finishTraining("Pointer lock lost", true);
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
  }, [finishTraining, processMouseMovement, updateKeysState]);

  useEffect(() => {
    if (!isTraining) {
      return;
    }

    const timer = window.setInterval(() => {
      setClock(performance.now());
    }, 100);

    return () => window.clearInterval(timer);
  }, [isTraining]);

  const syncRate = getSyncRate(stats);
  const resultLabel = getResultLabel(stats);
  const durationMs = stats.startedAt
    ? (stats.endedAt ?? clock) - stats.startedAt
    : 0;
  const barWidth = Math.min(48, Math.max(motion.intensity * 0.48, motion.direction === "neutral" ? 0 : 4));
  const isActiveMotion = motion.direction !== "neutral";
  const sessionState = isTraining ? "Live result" : stats.activeSamples > 0 ? "Last summary" : "Ready";
  const activeTime = useMemo(() => formatTime(stats.activeMs), [stats.activeMs]);
  const sessionTime = useMemo(() => formatTime(durationMs), [durationMs]);

  const getPrimaryKeyClass = (key: "a" | "d") => {
    const pressed = keys[key];
    const isExpected = motion.direction === "left" ? key === "a" : key === "d";
    const isOpposite = motion.direction === "left" ? key === "d" : key === "a";
    const hasSinglePrimaryKey = keys.a !== keys.d;
    const isBad = pressed && isActiveMotion && (keys.a && keys.d || isOpposite);
    const isGood =
      pressed &&
      isActiveMotion &&
      isExpected &&
      hasSinglePrimaryKey &&
      motion.quality === "sync";

    return classNames(
      "keycap",
      "keycap-large",
      pressed && "pressed",
      isGood && "good",
      isBad && "bad",
    );
  };

  const getSecondaryKeyClass = (key: "w" | "s" | "space") =>
    classNames(
      "keycap",
      "keycap-small",
      keys[key] && "pressed",
      (key === "w" || key === "s") && keys[key] && isActiveMotion && "warning",
    );

  return (
    <div
      ref={trainerRef}
      className={classNames("app-shell", isTraining && "training", isLocked && "locked")}
      tabIndex={-1}
    >
      <header className="trainer-header">
        <div>
          <p className="eyebrow">CS2 KZ sync trainer</p>
          <h1>Air Strafer</h1>
        </div>

        <div className="controls" aria-label="Training controls">
          <button type="button" onClick={startTraining} disabled={isTraining}>
            Start
          </button>
          <button type="button" onClick={() => finishTraining("Ready", true)} disabled={!isTraining}>
            Stop
          </button>
          <button type="button" onClick={resetTraining}>
            Reset
          </button>
        </div>
      </header>

      <div className="capture-status" role="status">
        <span className={classNames("status-dot", isLocked && "on")} />
        <span>{status}</span>
      </div>

      {!supportsPointerLock && (
        <p className="compat-note">Pointer lock unavailable in this browser.</p>
      )}

      <main className="training-grid">
        <section className={classNames("mouse-panel", motion.quality)}>
          <div className="panel-title">
            <span>Mouse</span>
            <strong>{motion.direction}</strong>
          </div>

          <div className="mouse-track" aria-label="Horizontal mouse movement">
            <div className="track-axis" />
            <div
              className="mouse-fill mouse-fill-left"
              style={{ width: motion.direction === "left" ? `${barWidth}%` : "0%" }}
            />
            <div
              className="mouse-fill mouse-fill-right"
              style={{ width: motion.direction === "right" ? `${barWidth}%` : "0%" }}
            />
            <div className="track-center" />
          </div>

          <div className="motion-readout">
            <span>{qualityLabels[motion.quality]}</span>
            <span>{Math.abs(motion.smoothX).toFixed(1)} dx</span>
          </div>
        </section>

        <section className="keys-panel" aria-label="Movement keys">
          <div className="primary-keys">
            <div className={getPrimaryKeyClass("a")}>A</div>
            <div className={getPrimaryKeyClass("d")}>D</div>
          </div>

          <div className="secondary-keys">
            <div className={getSecondaryKeyClass("w")}>W</div>
            <div className={getSecondaryKeyClass("s")}>S</div>
            <div className={getSecondaryKeyClass("space")}>Space</div>
          </div>
        </section>

        <section className="result-panel" aria-label="Training result">
          <div className="result-heading">
            <span>{sessionState}</span>
            <strong>{resultLabel}</strong>
          </div>

          <div className="sync-score">
            <span>{syncRate}</span>
            <small>% sync</small>
          </div>

          <div className="stats-grid">
            <div>
              <span>Streak</span>
              <strong>{stats.currentStreak}</strong>
            </div>
            <div>
              <span>Best</span>
              <strong>{stats.bestStreak}</strong>
            </div>
            <div>
              <span>Miss</span>
              <strong>{stats.misses}</strong>
            </div>
            <div>
              <span>Wrong</span>
              <strong>{stats.wrongWay}</strong>
            </div>
            <div>
              <span>Overlap</span>
              <strong>{stats.overlaps}</strong>
            </div>
            <div>
              <span>W/S</span>
              <strong>{stats.forwardPenalties}</strong>
            </div>
            <div>
              <span>Active</span>
              <strong>{activeTime}</strong>
            </div>
            <div>
              <span>Session</span>
              <strong>{sessionTime}</strong>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
