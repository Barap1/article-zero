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

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`GROQ_API_KEY` is optional. AI routes label live Groq output as `Live Groq` and use an honestly labeled deterministic fallback when the key is absent, unavailable, or rate-limited. A key is never required to build or run the judged demo.

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

## Guided demo and deployment

The exact guided demo sequence is: open the seeded workspace, inspect the legacy constitution, run the protected synthetic action and show the full-record breach, amend the emergency clause, compile and accept the typed policy change, run the regression suite, activate the approved version, replay the identical frozen attack and confirm `DENY`, run the verified-responder control and confirm minimum-field disclosure, request and approve privacy-officer approval for the ambiguous case, then open the audit timeline and export the audit package.

For a Vercel preview, run `vercel` from the repository and set the server-only variables from `.env.example` in project settings. Keep `GROQ_API_KEY` server-side; preview and fallback behavior both work without a database.

This is not a system prompt: human policy is represented as typed, versioned data and enforced by deterministic code, rather than trusting model instructions alone.

## MVP boundaries

This MVP uses synthetic fixtures and browser-local workspace persistence. Post-MVP persistence may add a managed backend only after the policy and data boundaries are proven.
