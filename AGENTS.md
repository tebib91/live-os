# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds the Next.js App Router pages/layouts; `components/` contains feature folders (app store, terminal, system monitor) plus primitives in `components/ui/`.
- `lib/` hosts utilities and WebSocket servers; `hooks/` holds shared React hooks; `constants/` centralizes config.
- `prisma/schema.prisma` defines the SQLite model; the working DB is `live-os.db` with generated client in `app/generated/`.
- Static assets live in `public/`; helper scripts are in `scripts/`. `server.ts` starts Next and optional WebSockets; `proxy.ts` exposes the HTTP proxy.

## Build, Test, and Development Commands
- `npm install` to bootstrap. `npm run dev` starts the app at `http://localhost:3000` (override with `PORT` or `LIVEOS_HTTP_PORT`).
- `npm run build` produces the production bundle; `npm start` serves it via the custom server.
- `npm run lint` / `npm run lint:fix` run ESLint (Next core-web-vitals config).
- `npm run update-apps` or `npm run update-apps:auto` refresh bundled apps; `npm run test-apps` runs the app-store sanity script.
- `npm run db:init` applies Prisma migrations to SQLite; set `DATABASE_URL` to use a different file.

## Coding Style & Naming Conventions
- Strict TypeScript; prefer `.tsx` with the `@/` alias. Keep files kebab-case, components PascalCase, utilities camelCase.
- Default to server components; add `'use client'` only when hooks/state are needed.
- Two-space indentation; avoid `any`; let ESLint drive formatting (no repo-level Prettier).
- Keep React components under roughly 300–350 lines; split UI and logic into smaller pieces when approaching that size.

## Testing Guidelines
- Current automation is `npm run test-apps`. Add targeted tests for new logic (parsers, Prisma access, WebSocket handlers).
- Co-locate tests with the feature or in a nearby `__tests__/` folder; keep fixtures small and deterministic.
- Before a PR, run lint and any new tests; note manual steps for UI flows, app-store ops, or terminal/system-status websockets.

## Commit & Pull Request Guidelines
- Use the existing conventional style: `feat: short summary`, `fix: …`, `chore: …`; keep subjects imperative and concise.
- PRs should describe the change, link issues, and call out env/migration impacts. Include screenshots or clips for UI updates and list commands to run.
- When altering data models, state migration steps (`npm run db:init`) and how to handle existing `live-os.db` copies.

## Security & Configuration Tips
- Never commit secrets; use `.env.local` for overrides. Key envs: `LIVEOS_HTTP_PORT`, `PORT`, `LIVEOS_DOMAIN`.
- Terminal support needs `node-pty`; without it, the app runs but logs a warning. Keep local database files out of version control when using real data.
