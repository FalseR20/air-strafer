import { InputMeter } from "./components/InputMeter";
import { SessionOverview } from "./components/SessionOverview";
import { TickTimeline } from "./components/TickTimeline";
import { TrainerHeader } from "./components/TrainerHeader";
import { useStrafeTrainer } from "./hooks/useStrafeTrainer";
import { classNames } from "./lib/classNames";
import "./index.css";

export function App() {
  const { actions, derived, state, supportsPointerLock, trainerRef } =
    useStrafeTrainer();

  return (
    <div
      ref={trainerRef}
      className={classNames(
        "app-shell",
        state.isJumping && "jumping",
        state.isTraining && "training",
        state.isLocked && "locked",
      )}
      tabIndex={-1}
    >
      <TrainerHeader
        actions={actions}
        isJumping={state.isJumping}
        isTraining={state.isTraining}
      />

      {!supportsPointerLock && (
        <p className="compat-note">Pointer lock unavailable in this browser.</p>
      )}

      <main className="training-grid">
        <section
          className={classNames("session-panel", state.motion.quality)}
          aria-label="Training overview"
        >
          <SessionOverview derived={derived} state={state} />
          <InputMeter
            barWidth={derived.barWidth}
            keys={state.keys}
            motion={state.motion}
          />
        </section>

        <TickTimeline ticks={state.ticks} />
      </main>
    </div>
  );
}

export default App;
