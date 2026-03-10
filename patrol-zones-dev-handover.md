# patrol-zones-dev-handover

## Project snapshot
- Expo Router mobile app + Express/TypeScript backend with Drizzle/PostgreSQL.
- Core modules are authenticated patrol operations, Code21 workflow persistence, map/routing tools, and section assignment board with officer presence.
- Most active development churn is in `app/index.tsx` and `components/PatrolMap.tsx`.

## Key systems
- **Auth/session:** `lib/auth-context.tsx`, `app/login.tsx`, `app/register.tsx`, `/api/auth/*`, `sessions` table.
- **Code21:** UI and workflow in `app/index.tsx`; server contracts in `server/routes.ts`; persistence in `server/storage.ts`; model in `shared/schema.ts`.
- **Assignments/presence:** `/api/presence/*`, `/api/sections/*`, tables `section_assignments` + `user_presence`.
- **Routing/elevation:** `/api/route`, `/api/elevation`, map polyline rendering in `PatrolMap`.

## Recent changes (high signal)
- Added auth-gated app flow and token persistence.
- Added richer Code21 metadata, status updates, archive search, and officer notes.
- Added assignment board and presence heartbeat lifecycle.
- Added runtime hardening (error normalization, request IDs/logging, health endpoints, env guardrails).
- Reworked map loading repeatedly to handle runtime crashes; current fallback can show map unavailable in Expo Go.

## Current risks
- Map support expectations are not fully aligned with runtime behavior (Expo Go fallback state).
- `app/index.tsx` is oversized and high risk for regression.
- Some docs/checklists are stale vs implemented architecture.

## Immediate next steps
1. Lock and document map runtime support policy (Expo Go vs custom dev build).
2. Start modular extraction of `app/index.tsx` into focused hooks/components.
3. Add API integration tests for auth ownership and assignment workflows.
4. Refresh docs/checklists to match current DB-backed implementation and APIs.
