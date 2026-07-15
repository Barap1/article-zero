# Article Zero

Article Zero is a synthetic constitutional command center for testing how policy controls agent actions in a simulated hospital environment. It is not a clinical system, an emergency service, or a source of patient guidance.

All data is synthetic. Do not use this repository with real patient data, healthcare credentials, or operational hospital systems.

## Architecture

```text
constitution -> policy engine -> typed proposal -> enforcement gateway -> synthetic tool result
                    |                    |
                  tests              audit trail
```

The client renders and dispatches typed actions. Domain, policy-engine, AI, hospital, activation, and workspace modules retain their separate responsibilities as they are implemented in later tasks.

## Setup

Use Node.js 22 LTS or newer and pnpm 10 or newer.

PowerShell:

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

macOS/Linux:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`GROQ_API_KEY` is optional for the bounded sample workflow. Without it, freeform clause compilation and revision show a setup message; manual structured policy editing remains available, and only the documented emergency sample uses the limited sample fallback. With a valid key, arbitrary valid clauses use the strict Groq compiler. The UI reports `Groq configured` until a real operation returns source `groq`, then reports `Live Groq`.

For local Groq use, put the key only in `.env.local` as `GROQ_API_KEY=...`; do not prefix it with `NEXT_PUBLIC_`, commit it, or expose it from a client component. The model and timeout variables in `.env.example` are server-only optional overrides.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:boundaries
pnpm check:assets
pnpm test:e2e
```

The release gate is `pnpm verify`, followed by `pnpm test:e2e`.

## Sample workflow and deployment

The sample workflow is: open the seeded workspace, inspect the legacy constitution, run a bounded synthetic request and inspect the incident, create an amendment without changing the clause until explicitly edited, compile and accept the typed policy change, run the regression suite, activate the approved version, replay the identical frozen attack and confirm it is blocked, run the verified-responder control and confirm minimum-field disclosure, optionally request and approve privacy-officer approval for the ambiguous case, then open the audit timeline and export the audit package.

For Vercel, add `GROQ_API_KEY` in Project Settings → Environment Variables for the environments that need live compilation (Preview and/or Production), then redeploy. Add `GROQ_POLICY_MODEL`, `GROQ_FAST_MODEL`, `GROQ_REQUEST_TIMEOUT_MS`, and `DEMO_FALLBACKS_ENABLED` only when overriding the `.env.example` defaults. Keep every Groq variable server-side; do not add them to `NEXT_PUBLIC_*`. Preview and the bounded sample workflow work without a key or database.

This is not a system prompt: human policy is represented as typed, versioned data and enforced by deterministic code, rather than trusting model instructions alone.

## MVP boundaries

This MVP uses synthetic fixtures and browser-local workspace persistence. Post-MVP persistence may add a managed backend only after the policy and data boundaries are proven.
