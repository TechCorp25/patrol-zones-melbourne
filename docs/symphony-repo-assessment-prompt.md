# Symphony Full-Repository Assessment Prompt

Use this prompt with Symphony to run a deep technical assessment of this repository and produce an actionable remediation plan.

## Instructional Prompt (copy/paste)

```text
You are a senior staff engineer performing a full-repository health and performance assessment.

Repository context:
- Project: Patrol Zones — Melbourne CBD
- Stack: Expo/React Native frontend, Express/TypeScript backend
- Goals: reliability, correctness, maintainability, performance, and reduced operational load

Mission:
1) Assess the ENTIRE repository to identify:
   - functional bugs and logic errors
   - runtime errors and crash risks
   - linting and type-safety issues
   - security concerns and secret-handling risks
   - inefficient code paths and unnecessary CPU/memory/network usage
   - build/release risks, dependency risks, and test coverage gaps
   - DX issues that can increase incident rate or mean-time-to-recovery
2) Prioritize findings by severity and production impact.
3) Produce a detailed, sequenced work plan and a concrete TODO checklist to fix all findings.

Execution requirements:
- Read all relevant source code and config (frontend, backend, scripts, tooling, CI/release files, environment docs).
- Run static checks where possible (lint/type/build/test), and clearly report when a check cannot run.
- Do not assume: cite exact files and line ranges for each finding.
- Group findings by domain: Correctness, Performance, Reliability, Security, Developer Experience.
- For each finding include:
  - title
  - severity (Critical/High/Medium/Low)
  - user/system impact
  - evidence (file + line range)
  - likely root cause
  - recommended fix
  - estimated effort (S/M/L)
  - risk of change

Output format (strict):
A) Executive Summary
- overall health score (0-100)
- top 10 risks

B) Findings Table
- one row per issue with columns:
  [ID, Severity, Domain, Description, Evidence, Impact, Proposed Fix, Effort]

C) Detailed Work Plan
- phased plan:
  - Phase 0: Immediate hotfixes (Critical)
  - Phase 1: Stabilization (High)
  - Phase 2: Quality/performance improvements (Medium)
  - Phase 3: Long-tail cleanup (Low)
- for each phase include:
  - objectives
  - implementation steps
  - validation/test strategy
  - rollback strategy
  - owner recommendation (Frontend/Backend/Infra)

D) Attached TODO Checklist
- markdown checkbox list grouped by phase
- each TODO references finding IDs
- each TODO has acceptance criteria

E) Performance & Load Reduction Section
- quantify current likely load amplifiers
- estimate expected improvements after fixes (qualitative if quantitative data unavailable)

F) Verification Command Log
- list every command executed and its result (pass/fail/warn)

Be exhaustive and practical. Prefer changes that reduce production incidents, battery/network drain, memory pressure, and server load.
```

## Suggested Usage Notes

- If running manually, paste the prompt above into your Symphony workflow and point it at the repository root.
- Ask Symphony to output the findings into a tracked document such as `docs/symphony-assessment-report.md`.
- Re-run the same prompt after remediation to compare before/after risk profile.
