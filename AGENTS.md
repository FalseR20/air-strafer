# AGENTS.md

Guidance for coding agents working in this repository.

## Project summary

CS2 Air Strafer is a frontend-only Bun/React trainer for air-strafe mouse and
A/D synchronization. It uses pointer lock to capture relative horizontal mouse
movement, samples input on a 64 tick cadence, scores each tick, and renders live
session feedback plus a four-lane tick timeline.

Keep changes focused on that training loop. Avoid expanding the app into a
general game trainer unless explicitly requested.

## Stack

- Runtime/build tool: Bun
- UI: React 19
- State: Zustand
- Language: TypeScript
- Styling: plain CSS in `src/index.css`
- Deployment: GitHub Pages via `.github/workflows/pages.yml`

## Commands

```bash
bun install
bun dev
bun run build
bun run preview
```

There is no test or typecheck script yet. Use `bun run build` as the baseline
verification command. If adding tests or typechecking, wire them into
`package.json` and document the commands here and in `README.md`.

## Architecture notes

- `src/trainer/domain/` should remain pure and easy to unit test.
- `src/trainer/application/trainerStore.ts` owns session state transitions.
- `src/trainer/infrastructure/useTrainerRuntime.ts` owns browser side effects:
  keyboard events, mouse movement, pointer lock, blur handling, and the tick
  loop.
- `src/components/` should stay presentational and consume derived trainer
  state rather than duplicating scoring rules.
- `src/lib/timeline.ts` owns timeline-specific derivations.

When changing scoring behavior, update both the domain logic and any affected
timeline labels or README descriptions.

## Product behavior

Expected sync rules:

- mouse left pairs with `A`
- mouse right pairs with `D`
- both keys together count as overlap
- movement with no A/D input counts as a miss
- movement with the opposite key counts as wrong-way input
- neutral ticks are not included in active sync statistics

The current implementation uses a 64 tick cadence, a 48 tick jump attempt, and
a 64 tick rolling result timeline.

## Editing guidance

- Prefer small, targeted changes.
- Preserve the domain/application/infrastructure separation.
- Do not introduce new frameworks or styling systems for small UI changes.
- Keep constants centralized in `src/trainer/domain/constants.ts`.
- If browser input behavior changes, consider pointer-lock failure, window blur,
  repeated keydown events, and cleanup of global listeners.
- The repo may contain generated `dist/` assets. Avoid editing generated output
  by hand.

## Good future improvements

- Add unit tests for scoring and timeline helpers.
- Add a `typecheck` script with TypeScript.
- Consider a configurable mouse deadzone instead of `DEADZONE = 0`.
- Store richer tick data, such as raw delta, smoothed delta, and quality, if the
  post-session review needs more detail.
