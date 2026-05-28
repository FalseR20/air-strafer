# CS2 Air Strafer

A frontend-only Bun/React trainer for CS2 air-strafe mouse and A/D sync.

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

## GitHub Pages

This repository includes a GitHub Actions workflow at
`.github/workflows/pages.yml` that builds the app with Bun and publishes the
generated `dist` directory to GitHub Pages.

To enable publishing:

1. Push to `main`.
2. In GitHub, open **Settings > Pages**.
3. Set **Build and deployment > Source** to **GitHub Actions**.

The app uses relative build asset URLs, so it works when published at a
repository path such as `https://<user>.github.io/air-strafer/`.

This project was created using `bun init` in bun v1.3.11. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
