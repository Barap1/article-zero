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

`GROQ_API_KEY` is optional. Future AI routes will label live Groq output when a key is available and deterministic fallback output otherwise. A key is never required to build the application.

## Validation

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:boundaries
pnpm check:assets
```

`check:assets` intentionally fails until Task 15 creates the final local visual assets.

## Guided demo and deployment

The guided policy-repair demo is implemented in later roadmap tasks. Its sequence is: open the seeded workspace, inspect the human constitution and compiled policy, run the synthetic attack, review the denied or allowed outcome, propose a policy amendment, run the deterministic regression gate, activate the approved revision, and replay the frozen attack to confirm the enforced outcome.

Once available, deploy with Vercel after setting only the optional server-side environment variables from `.env.example`; never expose `GROQ_API_KEY` to the browser.

This is not a system prompt: human policy is represented as typed, versioned data and enforced by deterministic code, rather than trusting model instructions alone.

## MVP boundaries

This MVP uses synthetic fixtures and browser-local workspace persistence. Post-MVP persistence may add a managed backend only after the policy and data boundaries are proven.
