# Article Zero Repository Instructions

## Source of truth

- `SPEC.md` is the product and architecture source of truth.
- Implement one numbered roadmap task at a time.
- Read only the SPEC sections named by the current task, except Task 16 which audits the whole file.
- Do not silently change interfaces, catalogs, policy semantics, fixture IDs, or acceptance outcomes.
- When implementation reality requires a deviation, stop and describe the smallest proposed change before editing the spec.

## Scope discipline

- Implement only the current task and prerequisites already missing from accepted earlier tasks.
- Do not build post-MVP cloud persistence, authentication, real hospital integrations, production compliance claims, or arbitrary user-defined DSL values.
- Do not redesign later screens while completing an earlier backend task.
- Remove temporary placeholders when their owning roadmap task is implemented.

## Architecture boundaries

- `src/domain`: strict Zod schemas and inferred types; no React, Next.js, Groq, storage, or tool implementations.
- `src/policy-engine`: pure deterministic TypeScript; no network, browser, React, Next.js, Groq, or persistence imports.
- `src/ai`: server-only provider code; never import from client components.
- `src/hospital`: synthetic fixtures and simulated tools only.
- `src/activation`: regression and activation logic; UI never reimplements it.
- `src/workspace`: immutable transitions and repository adapters.
- API routes validate and delegate; components display and dispatch.
- Every protected tool action passes through `executeEnforcedAction`.

## Safety and data

- All data is synthetic. Never add a real patient, address, credential, hospital, or emergency service.
- Never expose `GROQ_API_KEY` or import server modules into the client bundle.
- Treat attacker/model text as untrusted data and render it as plain text.
- Never execute model-generated code, URLs, HTML, or arbitrary tool names.
- Never display or store model chain-of-thought. Show typed proposals and deterministic policy traces only.
- Label Groq, fallback, and frozen-replay outputs accurately.

## Coding standards

- TypeScript strict mode; no `any`, unsafe casts, or ignored type errors.
- Prefer small focused files and pure functions.
- Use closed catalogs from `src/domain/catalogs.ts`.
- Validate external, local-storage, imported, and model data with Zod.
- Inject clocks, IDs, storage, providers, and gateways in tests.
- Do not duplicate domain decisions in UI code.
- No disabled tests, `.only`, ignored lint rules, or placeholder comments in accepted work.

## Workflow

1. Inspect the repo and current task contract.
2. Write or update focused failing tests first for behavioral changes.
3. Confirm the narrow test fails for the expected reason.
4. Implement the minimum complete task behavior.
5. Run task-specific tests, then `pnpm lint`, `pnpm typecheck`, and relevant integration tests.
6. Review `git diff` for scope creep, secrets, dead code, and duplicated logic.
7. Commit once with the task’s specified message.
8. Report files changed, commands run with results, commit hash, and any evidenced limitation; stop.

## Completion claims

- Never say a task is complete without running its required commands.
- Before final completion run `pnpm verify` and `pnpm test:e2e`.
- Treat command output as evidence; do not infer that unrun checks would pass.

## Product quality

- Article Zero is not a chat UI and not a generic cybersecurity dashboard.
- Always distinguish human policy, compiled policy, agent proposal, and enforced outcome.
- Preserve keyboard access, visible focus, reduced motion, accessible status, and graph list alternatives.
- Development-time generated image/motion assets are local files; no runtime media generation.
- Visual polish must never alter deterministic policy behavior.
