# Article Zero

**Turn plain-language AI policies into enforceable controls—and test them before they govern an agent.**

Article Zero is a policy-authoring and enforcement prototype for AI agents. It lets a signed-in user write policy in natural language, compiles that policy into a typed rule set, enforces the rules at the tool boundary, and stress-tests the result with replayable adversarial scenarios.

The current prototype uses a fully synthetic hospital emergency-disclosure scenario to demonstrate the core idea:

> AI policy should be easy for people to write, transparent enough to inspect, and reliable enough to enforce.

## Demo
[article--zero.vercel.app](article--zero.vercel.app)

The public landing page is available at `/`. The Article Zero workspace lives at `/workspace` and requires Firebase Authentication; there is no guest workspace.

## Why Article Zero

Most AI-agent policies live inside prompts. That makes them difficult to audit, easy to interpret inconsistently, and unreliable as a security boundary.

Article Zero separates **AI interpretation** from **policy enforcement**:

```text
Plain-language policy
        ↓
Groq-assisted structured compilation
        ↓
Human review and approval
        ↓
Deterministic policy engine
        ↓
Allow · Deny · Filter fields · Require approval
        ↓
Audit trail and replayable tests
```

The language model proposes structured rules. It does **not** make the final enforcement decision.

## Core capabilities

- **Plain-language policy authoring** with editable constitutional clauses
- **Structured policy compilation** using Groq and strict output validation
- **Visual and form-based policy review** before changes are accepted
- **Deterministic enforcement** for every protected tool action
- **Field-level disclosure controls** for minimum-necessary access
- **Adversarial testing** with synthetic responder scenarios
- **Regression-gated activation** so unsafe policy versions cannot go live
- **Exact attack replay** to prove whether an amendment fixed the failure
- **Human approval workflows** for ambiguous or break-glass situations
- **Versioned private workspaces** and exportable audit history

## Demonstration flow

The seeded scenario begins with an unsafe emergency-access rule.

1. An unverified responder requests a patient's full record.
2. The agent proposes a typed disclosure action.
3. The legacy policy permits excessive disclosure.
4. Article Zero explains the exact rule path that caused the breach.
5. The user amends the policy in plain language.
6. Groq compiles the amendment into structured rules.
7. Regression tests must pass before the new version can be activated.
8. The identical attack is replayed and denied.
9. A verified responder receives only the minimum emergency fields.

All identities, records, credentials, incidents, and outcomes are fictional.

## Architecture

```text
Next.js interface
├── Constitution and policy authoring
├── Attack, incident, testing, and replay workflows
└── Authenticated versioned workspace
        │
        ├── Groq policy intelligence
        │   ├── Compile natural-language clauses
        │   ├── Revise selected rules
        │   └── Normalize agent actions
        │
        ├── Deterministic policy engine
        │   ├── Three-valued condition evaluation
        │   ├── Priority and conflict resolution
        │   ├── Field allowlists
        │   └── Approval fallbacks
        │
        └── Simulated hospital tool gateway
            ├── Execute permitted actions
            ├── Block prohibited actions
            └── Record audit events
```

The Groq API key remains server-side. Groq interprets policy and proposes structured controls; deterministic code makes the final enforcement decision. Protected tools can only execute after the deterministic policy gateway returns an executable decision.

## Firebase setup

This pass uses the Firebase Web SDK only. Add the six `NEXT_PUBLIC_FIREBASE_*` values from your Firebase Web app to `.env.local`, enable Google and Email/Password providers, create Firestore in production mode, deploy the checked-in rules, and add your Vercel domain under Authentication → Settings → Authorized domains. See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for the exact console and deployment steps.

Each signed-in user owns one workspace document at:

```text
users/{uid}/workspaces/article-zero-default
```

Firestore rules deny access by default and permit a user to access only their own profile and workspace documents. Firebase is client-only in this pass: the existing Groq API routes remain server-side for `GROQ_API_KEY`, but they do not verify Firebase identity tokens. Do not describe those routes as Firebase-authenticated.

## Tech stack

- **Framework:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand with per-user Firestore persistence
- **Validation:** Zod
- **AI:** Groq SDK with structured JSON outputs
- **Policy visualization:** React Flow
- **Motion:** Motion for React
- **Testing:** Vitest, Testing Library, Playwright
- **Deployment:** Vercel-compatible, client-only Firebase integration

## Getting started

### Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer
- A Groq API key for live policy compilation

### Install

```powershell
git clone https://github.com/Barap1/archive-zero.git
Set-Location archive-zero
pnpm install
Copy-Item .env.example .env.local
```

Open `.env.local` and add your Groq key:

```dotenv
GROQ_API_KEY=gsk_your_key_here
GROQ_POLICY_MODEL=openai/gpt-oss-120b
GROQ_FAST_MODEL=openai/gpt-oss-20b
GROQ_REQUEST_TIMEOUT_MS=8000
DEMO_FALLBACKS_ENABLED=true
```

Then start the development server:

```powershell
pnpm dev
```

Open `http://localhost:3000`, create an account or sign in, then open the private workspace. The public landing page is intentionally accessible before authentication.


## Project structure

```text
src/
├── activation/       # Test-gated policy activation
├── ai/               # Groq provider, prompts, schemas, and fallbacks
├── app/              # Next.js pages and API routes
├── components/       # Product workflows and interface components
├── domain/           # Shared schemas, catalogs, and API contracts
├── hospital/         # Synthetic fixtures and protected tool gateway
├── policy-engine/    # Deterministic evaluation and analysis
├── red-team/         # Frozen replay behavior
└── workspace/        # Versioning, persistence, and state transitions

tests/
├── unit/
└── e2e/
```


## Roadmap

Near-term directions include:

- User-defined agent tools and policy catalogs
- Multiple domain templates beyond healthcare
- Durable team workspaces and role-based approvals
- Expanded adversarial test generation
- Policy import, export, and reusable organization templates
- CI-based policy regression testing
- Signed policy versions and stronger audit integrity

#### Built for Hoobit Hacks 2026
