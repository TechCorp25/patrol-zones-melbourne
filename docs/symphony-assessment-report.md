# Symphony Repository Assessment Report

## A) Executive Summary

- **Overall health score:** **61 / 100**
- **Assessment mode:** static code/config review + executable checks available in this container
- **Top 10 risks (ranked):**
  1. Symphony setup only configures env vars; no tracer/provider initialization is present, so tracing may still be effectively inactive at runtime.
  2. Backend build script requires `esbuild`, but `esbuild` is not declared in dependencies/devDependencies.
  3. Node typings are missing (`@types/node`), increasing TypeScript drift and reducing server-side type safety.
  4. No `test` script exists; there is no standard automated gate for regressions.
  5. CI/dev checks are not runnable in this environment due blocked package fetch (`E403`), indicating fragile dependency/bootstrap assumptions.
  6. README instructs copying `.env.symphony.example` to `.env`, but server startup code does not load `.env` files directly.
  7. Symphony API key is inserted into `OTEL_EXPORTER_OTLP_HEADERS` as a process env string, increasing accidental exposure risk via process dumps.
  8. `npx expo lint` in scripts can trigger network fetch behavior and non-deterministic tool resolution.
  9. No explicit validation command exists for the new Symphony assessment workflow outputs.
  10. No phased remediation artifact was previously checked in, reducing operational follow-through on identified issues.

---

## B) Findings Table

| ID | Severity | Domain | Description | Evidence | Impact | Proposed Fix | Effort |
|---|---|---|---|---|---|---|---|
| F001 | High | Reliability / Observability | Symphony integration is env-only bootstrap; no runtime OpenTelemetry SDK/provider initialization is present. | `server/symphony.ts` sets env defaults only; no SDK setup calls.【F:server/symphony.ts†L19-L71】 | Traces may not be emitted, creating blind spots for incidents and performance debugging. | Add explicit Symphony/OpenTelemetry initialization module (provider/exporter registration) and import it early in server startup. | M |
| F002 | High | Build / Delivery | `server:build` depends on `esbuild`, but package does not declare `esbuild`. | Build script references `esbuild` in scripts; dependency missing in devDependencies/dependencies.【F:package.json†L11-L18】【F:package.json†L68-L79】 | Build failures in fresh environments; blocked releases. | Add `esbuild` to `devDependencies` and ensure lockfile update/CI validation. | S |
| F003 | Medium | Type Safety | Node typings missing from devDependencies despite backend TS code using Node globals/APIs. | `@types/node` is absent from devDependencies list.【F:package.json†L68-L79】 | Reduced TS safety for server code, noisy compiler failures, slower debugging. | Add `@types/node` and include appropriate `types`/`lib` config if needed. | S |
| F004 | Medium | Quality Gate | No `test` script exists in package scripts. | Scripts block has no `test` command.【F:package.json†L5-L18】 | No standard regression gate in local/CI workflows. | Add `test` script (even initial smoke tests) and enforce in CI. | M |
| F005 | Medium | DX / Reliability | README tells users to copy `.env.symphony.example` to `.env`, but server startup does not load `.env` files itself. | README setup step references `.env`; server startup shows no dotenv load prior to env access.【F:README.md†L118-L125】【F:server/index.ts†L258-L270】 | Misconfiguration risk; developers think settings are loaded when they may not be. | Document required env loader/runtime behavior or explicitly load `.env` in startup. | S |
| F006 | Medium | Security | API key is propagated into OTEL headers environment variable at runtime. | `OTEL_EXPORTER_OTLP_HEADERS` is built from `SYMPHONY_API_KEY`.【F:server/symphony.ts†L39-L45】 | Secret exposure risk in diagnostics/process snapshots. | Prefer secret manager injection and avoid persisting composed secret headers where possible; mask sensitive logging paths. | S |
| F007 | Low | Tooling Stability | `npx expo lint` may rely on environment/network resolution and can be brittle under restricted access. | Lint scripts rely on `npx expo lint`.【F:package.json†L15-L16】 | Non-deterministic lint execution in locked-down environments. | Use locally installed binary invocation via npm scripts with pinned dependencies and CI cache strategy. | S |
| F008 | Low | Process / Governance | New assessment workflow lacked a committed execution report and task list before this run. | Prompt existed without generated report artifact at repo level prior to this assessment run.【F:docs/symphony-repo-assessment-prompt.md†L1-L83】 | Findings may not translate into tracked execution work. | Commit assessment output and TODO checklist; map items to owners/sprints. | S |

---

## C) Detailed Work Plan

### Phase 0: Immediate hotfixes (Critical)

**Objectives**
- Restore build determinism and ensure Symphony instrumentation actually initializes.

**Implementation steps**
1. Add missing build dependency (`esbuild`) and verify `npm run server:build` in CI.
2. Implement explicit Symphony/OpenTelemetry initialization path (not env-only).
3. Add startup assertion/health log confirming telemetry exporter registration.

**Validation / test strategy**
- Run backend build in clean install environment.
- Run smoke start with `SYMPHONY_ENABLED=true` and verify initialization confirmation log + emitted traces in staging.

**Rollback strategy**
- Feature flag for telemetry init (`SYMPHONY_ENABLED`) remains fallback.
- Revert to previous startup path if init errors are detected.

**Owner recommendation**
- Backend + Infra.

### Phase 1: Stabilization (High)

**Objectives**
- Improve local/CI confidence and prevent configuration drift.

**Implementation steps**
1. Add `@types/node` and align TS server config.
2. Clarify/load `.env` behavior for Symphony in runtime bootstrap.
3. Add baseline `test` script and CI job stage.

**Validation / test strategy**
- `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run server:build` in CI.

**Rollback strategy**
- Keep old scripts temporarily under alternate names until pipeline stabilizes.

**Owner recommendation**
- Backend.

### Phase 2: Quality/performance improvements (Medium)

**Objectives**
- Reduce tooling/network fragility and improve reliability under restricted environments.

**Implementation steps**
1. Replace brittle `npx` workflow with deterministic project-local command resolution strategy.
2. Add performance-focused lint rules/checks and simple profiling checklist.
3. Define acceptance metrics for load reduction opportunities in app + server.

**Validation / test strategy**
- Repeatability checks in offline/restricted CI runners.
- Compare pre/post command pass rates and run durations.

**Rollback strategy**
- Keep backward-compatible scripts during transition window.

**Owner recommendation**
- Infra + Frontend + Backend.

### Phase 3: Long-tail cleanup (Low)

**Objectives**
- Institutionalize repository health checks.

**Implementation steps**
1. Schedule recurring Symphony assessment runs and publish versioned reports.
2. Create issue templates linking finding IDs and acceptance criteria.
3. Track resolved findings and health score trend.

**Validation / test strategy**
- Quarterly report diff and closure-rate metrics.

**Rollback strategy**
- N/A (process improvements).

**Owner recommendation**
- Engineering management + Tech leads.

---

## D) Attached TODO Checklist

### Phase 0
- [ ] **(F002)** Add `esbuild` to `devDependencies` and regenerate lockfile.  
  **Acceptance criteria:** `npm run server:build` succeeds on clean install.
- [ ] **(F001)** Implement true Symphony/OpenTelemetry SDK initialization at startup.  
  **Acceptance criteria:** startup confirms initialized exporter and traces visible in target Symphony environment.

### Phase 1
- [ ] **(F003)** Add `@types/node` and adjust TS config for server context.  
  **Acceptance criteria:** server TS errors for Node globals/types are eliminated in normal toolchain runs.
- [ ] **(F005)** Align README env guidance with actual env loading behavior (`dotenv` load or explicit runtime instructions).  
  **Acceptance criteria:** following README steps yields working Symphony config without hidden assumptions.
- [ ] **(F004)** Add `test` script and at least smoke-level backend/frontend checks.  
  **Acceptance criteria:** CI executes `npm run test` as required gate.

### Phase 2
- [ ] **(F007)** Replace/standardize brittle `npx` script usage for lint/build workflows.  
  **Acceptance criteria:** lint/build checks are deterministic in CI and local runs.
- [ ] **(F006)** Reduce API-key exposure surface in runtime env/header composition.  
  **Acceptance criteria:** secrets are sourced securely and not materialized beyond required boundaries.

### Phase 3
- [ ] **(F008)** Automate periodic Symphony assessment report generation and tracking.  
  **Acceptance criteria:** versioned report artifact exists per release cycle with mapped issue links.

---

## E) Performance & Load Reduction

- **Likely current load amplifiers**
  - Missing/partial tracing means slow paths are harder to detect, allowing inefficient code paths to persist longer (higher sustained CPU and latency risk).
  - Build/check instability reduces frequency of preventative validation, increasing probability of high-cost runtime incidents.
  - Tooling fragility in restricted environments increases rerun/retry overhead during CI and releases.

- **Expected improvement after plan execution**
  - **Observability improvements:** faster incident triage and hotspot detection once true telemetry is active.
  - **Reliability improvements:** fewer failed builds and lower release friction after dependency/tooling fixes.
  - **Operational load:** reduced firefighting overhead via enforced test/validation gates and repeatable checks.

---

## F) Verification Command Log

| Command | Result | Notes |
|---|---|---|
| `npm run lint` | Warn/Fail | `E403` fetching `expo` from registry in this environment; lint not runnable here. |
| `npm run server:build` | Fail | `esbuild: not found` confirms missing dependency in environment/toolchain. |
| `npx tsc --noEmit` | Warn/Fail | Fails with missing dependencies/types and base config resolution in this environment (`expo/tsconfig.base` unresolved). |
| `git status --short` | Pass | Used to confirm workspace state before/after report generation. |

