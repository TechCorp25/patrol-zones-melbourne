# Release Work Plan (Second-Pass Audit)

## Recommended deployment platform
1. **Primary recommendation: Android (EAS internal distribution first, then Play private track).**
   - Field deployments in council/enterprise environments are commonly Android-managed and easier to distribute internally with dev/preview channels.
   - Native `react-native-maps` + location permissions are operationally simpler to validate at scale on Android-first for patrol workflows.
2. **Secondary: iOS after Android parity is signed off.**
   - Run TestFlight once Android UAT confirms map/location/heading and Code 21/presence behavior.

## Deployment phases

### Phase 0 — Preflight and environment readiness
- Set mobile env vars:
  - `EXPO_PUBLIC_API_BASE_URL`
  - `EXPO_PUBLIC_ENVIRONMENT`
- Set server env vars:
  - `DATABASE_URL`
  - `SESSION_TTL_HOURS`
  - `ROUTING_PROVIDER`
  - `ROUTING_BASE_URL` (or provider credentials)
  - `ELEVATION_PROVIDER`
- Set `EXPO_PUBLIC_EAS_PROJECT_ID` (or `EAS_PROJECT_ID`) to your Expo project UUID.
- Run `cd my-app && npm run release:preflight`.

### Phase 1 — Validation gate
- Mobile: `cd my-app && npm run check`
- Server: `cd my-app/server && npm run check`
- Smoke API routes:
  - `/api/health/live`
  - `/api/health/ready`
  - auth/code21/sections/presence/route/elevation endpoints

### Phase 2 — Build and internal rollout
- Configure EAS project once: `cd my-app && npm run eas:configure`
- Android dev build: `cd my-app && npm run build:android:development`
- Android preview build: `cd my-app && npm run build:android:preview`
- Internal UAT checklist:
  - Login/register
  - Live GPS + zone detection
  - Heading/compass updates
  - Assigned zone persistence
  - Code 21 create/edit/archive
  - Route metrics and board/presence flows

### Phase 3 — Production promotion
- Android production: `cd my-app && npm run build:android:production`
- iOS production (after parity): `cd my-app && npx eas build --profile production --platform ios`
- Publish OTA-safe updates only after native compatibility check:
  - `cd my-app && npx eas update --branch production --message "release: <version>"`

## Second-pass audit findings (original repo + clean-room)

### Confirmed improvements
- Clean-room runtime under `my-app/` exists and is separated from legacy root runtime.
- EAS profiles are present (`development`, `preview`, `production`) and CLI gating is configured.
- README now identifies legacy root as reference behavior and `my-app/` as active target.

### Remaining deployment blockers to resolve before release
1. `EXPO_PUBLIC_EAS_PROJECT_ID` must be populated in local shells/CI/EAS secrets before running cloud builds.
2. `my-app` test runner availability is environment-sensitive (`vitest` binary unavailable in current shell snapshot).
3. Backend endpoints are scaffolded but still lightweight placeholders and require production storage/auth hardening.
4. Data files are sample fixtures and must be replaced with full authoritative datasets for behavior parity.

## Operational handoff checklist
- [ ] `EXPO_PUBLIC_EAS_PROJECT_ID` configured in local env and EAS secrets
- [ ] Mobile/server env vars configured in CI and EAS secrets
- [ ] `npm run check` passing for mobile and server
- [ ] Android internal pilot signed off by patrol operations
- [ ] iOS TestFlight parity signed off
- [ ] Incident rollback playbook documented (previous stable build + EAS update rollback)
