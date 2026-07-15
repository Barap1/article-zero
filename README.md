# Article Zero

Article Zero is a calm, inspectable workspace for authoring and enforcing policy around hospital-agent actions. It turns human-readable constitutional clauses into typed rules, lets a reviewer inspect every proposed change, and proves the result at a deterministic tool boundary.

It is a product prototype for policy design and replayable evaluation. It is not a clinical system, emergency service, compliance certification, or source of patient guidance.

## The problem

An agent can produce a plausible request while still asking for too much data. A useful policy workflow must keep three things distinct:

1. The human clause that describes the intent.
2. The typed agent proposal that describes the requested action.
3. The deterministic enforcement result that decides what the synthetic tool may do.

Article Zero makes those boundaries visible and reviewable instead of hiding them in a chat transcript.

## How it works

```text
human clause
    -> typed compile proposal
    -> structured policy review
    -> synthetic agent request
    -> deterministic policy decision
    -> enforced tool result + audit event
    -> amendment, tests, activation, and replay
```

The sample workspace starts with a deliberately unsafe emergency disclosure rule. You can run the synthetic request, inspect the incident, amend the clause, compile and accept the typed preview, run the regression gate, activate the draft, and replay the same request against the safer version.

## Architecture

```text
src/domain          strict Zod schemas and closed catalogs
src/policy-engine   pure rule resolution, evaluation, analysis, and hashing
src/ai              server-only Groq provider and bounded sample fallback
src/hospital        synthetic fixtures and simulated protected tools
src/activation      deterministic regression and activation gate
src/workspace       immutable transitions and browser-local persistence
src/components      workflow presentation and typed dispatch
```

The client never receives `GROQ_API_KEY`, model-generated code, arbitrary tool names, or chain-of-thought. Model output is validated as typed data before it can become a preview. Every protected action is routed through the enforcement gateway.

## Product surface

- Human policy authoring with editable article titles and text.
- Typed compile previews with explicit accept or reject decisions.
- Summary-first structured policy review with closed catalogs, findings, revision previews, raw JSON, and a keyboard-operable policy graph.
- Bounded synthetic attack scenarios with editable request wording.
- Distinct incident evidence showing requested, disclosed, and withheld fields plus a deterministic decision trace.
- Focused amendment workspace that does not silently edit the original clause.
- Regression testing, activation blocking, frozen replay, optional approval control, and an exportable audit timeline.
- Browser-local persistence so a return home keeps the current work.

## Local setup

Requirements: Node.js 22 LTS or newer and pnpm 10 or newer.

PowerShell:

```powershell
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

macOS or Linux:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

### Groq setup

`GROQ_API_KEY` is optional. To enable live compilation and revision, set it only in the server-side `.env.local` file:

```dotenv
GROQ_API_KEY=gsk_your_key_here
GROQ_POLICY_MODEL=openai/gpt-oss-120b
GROQ_FAST_MODEL=openai/gpt-oss-20b
GROQ_REQUEST_TIMEOUT_MS=8000
DEMO_FALLBACKS_ENABLED=true
```

Never use a `NEXT_PUBLIC_` prefix for the key, commit `.env.local`, or expose server modules from a client component. The interface reports Groq as live only after an operation actually returns a Groq result.

### Fallback limitation

Without a valid key, manual structured editing remains available. The deterministic fallback is intentionally limited to the documented emergency sample workflow. It is not a general freeform compiler and should not be treated as one. The UI labels fallback and frozen-replay results explicitly.

## Commands

```powershell
pnpm dev                 # local development
pnpm lint                # ESLint with zero warnings
pnpm typecheck           # strict TypeScript check
pnpm test                # unit and integration tests
pnpm test:e2e            # Playwright workflow checks
pnpm build               # production build
pnpm check:boundaries    # client/server import boundaries
pnpm check:assets        # generated asset checks
pnpm verify              # release gate: lint, types, tests, boundaries, assets, build
```

## Sample workflow

1. Open the sample policy workspace and review the legacy clause.
2. Run the fake-responder scenario and open its incident.
3. Create an amendment, edit or apply the suggested repair, compile a preview, and accept it explicitly.
4. Run the regression suite and resolve the deterministic activation gate.
5. Activate the tested draft.
6. Replay the frozen fake request and confirm it is blocked.
7. Run the verified-responder control and confirm minimum-field disclosure.
8. Optionally run the human-approval branch, then inspect or export the audit timeline.

## Vercel deployment

Create a Vercel project from this repository. In Project Settings, add `GROQ_API_KEY` to the Preview and/or Production environments that need live AI compilation. Add the optional `GROQ_POLICY_MODEL`, `GROQ_FAST_MODEL`, `GROQ_REQUEST_TIMEOUT_MS`, and `DEMO_FALLBACKS_ENABLED` variables only when overriding `.env.example`. Redeploy after changing environment variables. The bounded sample flow works without a database or a Groq key.

## Synthetic data and security boundary

Every identity, patient, address, credential, hospital, and outcome in this repository is synthetic. Do not connect it to a real hospital, real patient record, real credential, or emergency service. The project does not claim clinical readiness or regulatory compliance. Treat all model and attacker text as untrusted plain text, keep policy decisions deterministic, and preserve the server-only key boundary.

## Roadmap

- Improve authoring ergonomics while keeping the policy catalog closed and reviewable.
- Add stronger scenario coverage and richer deterministic trace inspection.
- Add a managed persistence layer only after the policy and data boundaries are proven.
- Add authentication and operational integrations only with explicit security and governance work.
