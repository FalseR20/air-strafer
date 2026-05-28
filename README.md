# CS2 Air Strafer

A frontend-only Bun/React trainer for CS2 air-strafe mouse and A/D sync.

The app captures horizontal mouse movement through pointer lock, samples input
on a 64 tick rhythm, compares the movement direction with the current A/D key
state, and shows immediate feedback plus a rolling tick timeline.

## Idea

Air strafing depends on keeping mouse movement and strafe keys synchronized:

- mouse left should pair with `A`
- mouse right should pair with `D`
- holding both keys, using the opposite key, or moving without a key is scored
  as a mistake

This project is intentionally narrow. It is not a full aim trainer or CS2
physics simulator; it is a focused browser drill for input timing and rhythm.

## Controls

- `Space`: start a short jump attempt
- `W` release: start a short jump attempt
- `P`: toggle free practice
- `Esc`: stop the current session
- `A` / `D`: strafe input

Pointer lock is required so the browser can read relative mouse movement.

## Project structure

```text
src/
  trainer/
    domain/            Pure scoring, constants, selectors, and state types
    application/       Zustand trainer store
    infrastructure/    Browser input, pointer lock, and tick runtime
  components/          React UI panels and timeline
  hooks/               Public trainer hook used by the app
  lib/                 Formatting, class name, and timeline helpers
```

Key files:

- `src/trainer/domain/scoring.ts`: tick scoring and result classification
- `src/trainer/domain/constants.ts`: tick rate, sample window, and limits
- `src/trainer/application/trainerStore.ts`: session state and actions
- `src/trainer/infrastructure/useTrainerRuntime.ts`: keyboard, mouse, pointer
  lock, and 64 tick sampling loop
- `src/lib/timeline.ts`: derived data for the four-lane tick timeline

## Development

Install dependencies:

```bash
bun install
```

Start the development server:

```bash
bun dev
```

Build static assets:

```bash
bun run build
```

Preview the production build:

```bash
bun run preview
```

There is currently no dedicated test or typecheck script. The main available
verification command is:

```bash
bun run build
```

The pure trainer domain code is a good target for future unit tests, especially
`getTickQuality`, `sampleTickState`, result labels, and timeline slot behavior.

## GitHub Pages

This repository includes a GitHub Actions workflow at
`.github/workflows/pages.yml` that builds the app with Bun and publishes the
generated `dist` directory to GitHub Pages.

To enable publishing:

1. Push to `main`.
2. In GitHub, open **Settings > Pages**.
3. Set **Build and deployment > Source** to **GitHub Actions**.

This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
