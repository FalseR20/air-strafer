import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

type Direction = "left" | "right" | "neutral";
type TickQuality = "sync" | "miss" | "wrong" | "overlap" | "neutral";

type KeyState = {
  a: boolean;
  d: boolean;
};

type TrainingStats = {
  activeTicks: number;
  syncedTicks: number;
  misses: number;
  wrongWay: number;
  overlaps: number;
  currentStreak: number;
  bestStreak: number;
  activeMs: number;
  startedAt: number | null;
  endedAt: number | null;
};

type MotionState = {
  direction: Direction;
  intensity: number;
  quality: TickQuality;
  smoothX: number;
};

type TickResult = {
  id: number;
  tickIndex: number;
  direction: Direction;
  quality: TickQuality;
  symbol: string;
  detail: string;
  a: boolean;
  d: boolean;
  sessionMs: number;
  smoothX: number;
};

const TICK_RATE = 64;
const TICK_MS = 1000 / TICK_RATE;
const RESULT_TICK_COUNT = 64;
const DEADZONE = 1.6;
const MOUSE_WINDOW = 6;

const createKeys = (): KeyState => ({
  a: false,
  d: false,
});

const createStats = (startedAt: number | null = null): TrainingStats => ({
  activeTicks: 0,
  syncedTicks: 0,
  misses: 0,
  wrongWay: 0,
  overlaps: 0,
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

const qualityLabels: Record<TickQuality, string> = {
  sync: "Synced",
  miss: "No key",
  wrong: "Wrong key",
  overlap: "Overlap",
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
  if (stats.activeTicks === 0) {
    return 0;
  }

  return Math.round((stats.syncedTicks / stats.activeTicks) * 100);
};

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
};

const formatSeconds = (milliseconds: number) =>
  `${(Math.max(0, milliseconds) / 1000).toFixed(2)}s`;

const getResultLabel = (stats: TrainingStats) => {
  if (stats.activeTicks === 0) {
    return "No Samples";
  }

  const syncRate = getSyncRate(stats);
  const overlapRate = stats.overlaps / stats.activeTicks;
  const wrongRate = stats.wrongWay / stats.activeTicks;
  const missRate = stats.misses / stats.activeTicks;

  if (overlapRate > 0.12) {
    return "Too Much Overlap";
  }

  if (wrongRate > 0.12) {
    return "Wrong Key";
  }

  if (missRate > 0.18) {
    return "Late";
  }

  if (syncRate >= 95) {
    return "Perfect";
  }

  if (syncRate >= 82) {
    return "Good";
  }

  return "Needs Sync";
};

const getTickSymbol = (quality: TickQuality) => {
  switch (quality) {
    case "sync":
      return "•";
    case "miss":
      return "M";
    case "wrong":
      return "X";
    case "overlap":
      return "O";
    case "neutral":
      return "·";
  }
};

const getTickDetail = (quality: TickQuality, direction: Direction) => {
  switch (quality) {
    case "sync":
      return direction === "left" ? "Mouse left + A" : "Mouse right + D";
    case "miss":
      return "Mouse movement without A/D input";
    case "wrong":
      return `Mouse ${direction} with the opposite strafe key`;
    case "overlap":
      return "A and D held together";
    case "neutral":
      return "Neutral tick";
  }
};

type TickLane = "mouseLeft" | "mouseRight" | "a" | "d";

const tickLanes: Array<{ id: TickLane; label: string }> = [
  { id: "mouseLeft", label: "Mouse L" },
  { id: "mouseRight", label: "Mouse R" },
  { id: "a", label: "A" },
  { id: "d", label: "D" },
];

const getLaneActive = (lane: TickLane, tick: TickResult) => {
  switch (lane) {
    case "mouseLeft":
      return tick.direction === "left";
    case "mouseRight":
      return tick.direction === "right";
    case "a":
      return tick.a;
    case "d":
      return tick.d;
  }
};

const getLaneSymbol = (lane: TickLane, tick: TickResult) => {
  switch (lane) {
    case "mouseLeft":
      return tick.direction === "left" ? tick.symbol : "·";
    case "mouseRight":
      return tick.direction === "right" ? tick.symbol : "·";
    case "a":
      return tick.a ? "A" : "·";
    case "d":
      return tick.d ? "D" : "·";
  }
};

const getLaneQuality = (lane: TickLane, tick: TickResult): TickQuality | "key-neutral" => {
  const laneActive = getLaneActive(lane, tick);

  if (!laneActive) {
    return "neutral";
  }

  if (lane === "a") {
    if (tick.quality === "overlap") {
      return "overlap";
    }

    if (tick.direction === "left" && tick.quality === "sync") {
      return "sync";
    }

    if (tick.direction === "right" && tick.quality === "wrong") {
      return "wrong";
    }

    return "key-neutral";
  }

  if (lane === "d") {
    if (tick.quality === "overlap") {
      return "overlap";
    }

    if (tick.direction === "right" && tick.quality === "sync") {
      return "sync";
    }

    if (tick.direction === "left" && tick.quality === "wrong") {
      return "wrong";
    }

    return "key-neutral";
  }

  return tick.quality;
};

function TickTimeline({ ticks }: { ticks: TickResult[] }) {
  const visibleTicks = ticks.slice(-RESULT_TICK_COUNT);
  const emptySlots = Math.max(0, RESULT_TICK_COUNT - visibleTicks.length);
  const slots: Array<TickResult | null> = [
    ...Array.from({ length: emptySlots }, () => null),
    ...visibleTicks,
  ];

  return (
    <section className="tick-timeline-panel" aria-label="64 tick input timeline">
      <div className="strip-heading">
        <span>Tick timeline</span>
        <strong>4 lanes / {RESULT_TICK_COUNT} ticks</strong>
      </div>

      <div className="tick-timeline">
        {tickLanes.map(lane => (
          <div className="tick-lane" key={lane.id}>
            <div className="tick-lane-label">{lane.label}</div>
            <div className="tick-lane-cells">
              {slots.map((tick, index) => {
                const laneQuality = tick ? getLaneQuality(lane.id, tick) : "neutral";
                const symbol = tick ? getLaneSymbol(lane.id, tick) : "·";
                const tooltip = tick
                  ? `${lane.label} | Tick ${tick.tickIndex} | ${qualityLabels[tick.quality]} | ${tick.detail} | A:${tick.a ? "on" : "off"} D:${tick.d ? "on" : "off"} | ${formatSeconds(tick.sessionMs)}`
                  : `${lane.label} | Waiting for tick`;

                return (
                  <div
                    aria-label={tooltip}
                    className={classNames(
                      "tick-cell",
                      tick && getLaneActive(lane.id, tick) && "active",
                      `tick-${laneQuality}`,
                    )}
                    data-tooltip={tooltip}
                    key={tick ? `${lane.id}-${tick.id}` : `${lane.id}-empty-${index}`}
                    role="img"
                    tabIndex={0}
                  >
                    {symbol}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="strip-legend" aria-label="Result strip legend">
        <span><b className="legend-sync">•</b> sync</span>
        <span><b className="legend-miss">M</b> no key</span>
        <span><b className="legend-wrong">X</b> wrong</span>
        <span><b className="legend-overlap">O</b> overlap</span>
        <span><b className="legend-neutral">·</b> neutral</span>
      </div>
    </section>
  );
}

export function App() {
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
  const hasResults = stats.activeTicks > 0;

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
      return;
    }

    const now = performance.now();
    const freshStats = createStats(now);

    trainingRef.current = true;
    lockedRef.current = document.pointerLockElement === element;
    mouseWindowRef.current = [];
    mouseDeltaRef.current = 0;
    tickIndexRef.current = 0;
    setTicks([]);
    setStatsState(freshStats);
    setKeysState(createKeys());
    setMotion(initialMotion);
    setIsTraining(true);
    setClock(now);

    try {
      const request = element.requestPointerLock();

      if (request instanceof Promise) {
        request.catch(() => finishTraining(false));
      }
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

    if (document.pointerLockElement === trainerRef.current) {
      document.exitPointerLock();
    }
  }, [setKeysState, setStatsState]);

  const sampleTick = useCallback((now: number) => {
    if (!trainingRef.current || !lockedRef.current) {
      return;
    }

    const rawDelta = mouseDeltaRef.current;
    mouseDeltaRef.current = 0;

    const windowValues = mouseWindowRef.current;
    windowValues.push(rawDelta);

    if (windowValues.length > MOUSE_WINDOW) {
      windowValues.shift();
    }

    const smoothX =
      windowValues.reduce((total, value) => total + value, 0) / windowValues.length;
    const direction = getDirection(smoothX);
    const intensity = Math.min(100, Math.abs(smoothX) * 16);
    const currentKeys = keysRef.current;
    const hasOverlap = currentKeys.a && currentKeys.d;
    const expectedKey = direction === "left" ? "a" : "d";
    const oppositeKey = direction === "left" ? "d" : "a";
    const hasExpectedKey = direction !== "neutral" && currentKeys[expectedKey];
    const hasOppositeKey = direction !== "neutral" && currentKeys[oppositeKey];

    let quality: TickQuality = "neutral";

    if (direction !== "neutral") {
      if (hasOverlap) {
        quality = "overlap";
      } else if (!hasExpectedKey && !hasOppositeKey) {
        quality = "miss";
      } else if (!hasExpectedKey && hasOppositeKey) {
        quality = "wrong";
      } else {
        quality = "sync";
      }
    }

    const currentStats = statsRef.current;
    const activeTick = direction !== "neutral";
    const syncedTick = quality === "sync";
    const nextStreak = activeTick
      ? syncedTick
        ? currentStats.currentStreak + 1
        : 0
      : currentStats.currentStreak;
    const nextStats: TrainingStats = {
      ...currentStats,
      activeTicks: currentStats.activeTicks + (activeTick ? 1 : 0),
      syncedTicks: currentStats.syncedTicks + (syncedTick ? 1 : 0),
      misses: currentStats.misses + (quality === "miss" ? 1 : 0),
      wrongWay: currentStats.wrongWay + (quality === "wrong" ? 1 : 0),
      overlaps: currentStats.overlaps + (quality === "overlap" ? 1 : 0),
      currentStreak: nextStreak,
      bestStreak: Math.max(currentStats.bestStreak, nextStreak),
      activeMs: currentStats.activeMs + (activeTick ? TICK_MS : 0),
    };

    tickIndexRef.current += 1;

    const sessionMs = currentStats.startedAt ? now - currentStats.startedAt : 0;
    const tick: TickResult = {
      id: tickIndexRef.current,
      tickIndex: tickIndexRef.current,
      direction,
      quality,
      symbol: getTickSymbol(quality),
      detail: getTickDetail(quality, direction),
      a: currentKeys.a,
      d: currentKeys.d,
      sessionMs,
      smoothX,
    };

    setStatsState(nextStats);
    setMotion({
      direction,
      intensity,
      quality,
      smoothX,
    });
    setTicks(previous => [...previous, tick].slice(-RESULT_TICK_COUNT));
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

        if (event.repeat) {
          return;
        }

        if (trainingRef.current) {
          finishTraining(true);
        } else {
          startTraining();
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
  }, [finishTraining, resetTraining, startTraining, updateKeysState]);

  useEffect(() => {
    if (!isTraining) {
      return;
    }

    const timer = window.setInterval(() => {
      sampleTick(performance.now());
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [isTraining, sampleTick]);

  const syncRate = getSyncRate(stats);
  const resultLabel = hasResults ? getResultLabel(stats) : "";
  const durationMs = stats.startedAt
    ? (stats.endedAt ?? clock) - stats.startedAt
    : 0;
  const barWidth = Math.min(
    48,
    Math.max(motion.intensity * 0.48, motion.direction === "neutral" ? 0 : 4),
  );
  const isActiveMotion = motion.direction !== "neutral";
  const sessionState = isTraining ? "Live result" : hasResults ? "Last summary" : "Ready";
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
      "keycap-compact",
      pressed && "pressed",
      isGood && "good",
      isBad && "bad",
    );
  };

  return (
    <div
      ref={trainerRef}
      className={classNames("app-shell", isTraining && "training", isLocked && "locked")}
      tabIndex={-1}
    >
      <header className="trainer-header">
        <div>
          <p className="eyebrow">CS2 64 tick sync trainer</p>
          <h1>Air Strafer</h1>
        </div>

        <div className="controls" aria-label="Training controls">
          <button
            type="button"
            onClick={isTraining ? () => finishTraining(true) : startTraining}
          >
            <span>{isTraining ? "Stop" : "Start"}</span>
            <kbd>Space</kbd>
          </button>
          <button type="button" onClick={resetTraining} disabled={!hasResults}>
            <span>Reset</span>
            <kbd>R</kbd>
          </button>
        </div>
      </header>

      {!supportsPointerLock && (
        <p className="compat-note">Pointer lock unavailable in this browser.</p>
      )}

      <main className="training-grid">
        <section className={classNames("session-panel", motion.quality)} aria-label="Training overview">
          <div className="stats-panel">
            <div className="result-summary">
              <div className="result-heading">
                <span className="session-state">
                  <span className={classNames("status-dot", isLocked && "on")} />
                  <span>{sessionState}</span>
                </span>
                {resultLabel && <strong>{resultLabel}</strong>}
              </div>

              <div className="sync-score">
                <span>{syncRate}</span>
                <small>% sync</small>
              </div>
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
                <span>Ticks</span>
                <strong>{stats.activeTicks}</strong>
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
          </div>

          <div className="input-panel">
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

            <div className="mouse-support-row">
              <div className="motion-state">{qualityLabels[motion.quality]}</div>

              <div className="mini-keys" aria-label="Movement keys">
                <div className={getPrimaryKeyClass("a")}>A</div>
                <div className={getPrimaryKeyClass("d")}>D</div>
              </div>

              <div className="motion-delta">{Math.abs(motion.smoothX).toFixed(1)} dx/tick</div>
            </div>
          </div>
        </section>

        <TickTimeline ticks={ticks} />
      </main>
    </div>
  );
}

export default App;
