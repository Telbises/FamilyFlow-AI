# FamilyFlow AI

**Less scrolling. More living together.**

Family coordination and adventure app for the [Amazon Devices Hackathon 2026](https://amazonappdev2026.devpost.com/) (Fire TV track + AWS Builder mini-challenge).

Parents and kids browse missions on the living-room screen, request adventures by TV or Alexa FamilyFlow skill, and parents approve everything in a web dashboard. Points unlock **non-purchasable** family rewards. Visibility is **FamilyFlow activity only** — not unrelated Alexa chats, Amazon purchases, or third-party Fire TV telemetry.

## Status and docs

- [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) — 30-step roadmap  
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/SECURITY.md`](docs/SECURITY.md) · [`docs/PRIVACY_AND_CHILD_SAFETY.md`](docs/PRIVACY_AND_CHILD_SAFETY.md)  
- [`docs/TEST_MATRIX.md`](docs/TEST_MATRIX.md) · [`docs/SIMULATOR_TEST_GUIDE.md`](docs/SIMULATOR_TEST_GUIDE.md)  
- [`docs/AWS_COSTS_AND_TEARDOWN.md`](docs/AWS_COSTS_AND_TEARDOWN.md) · [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md)  
- [`docs/HACKATHON_SUBMISSION.md`](docs/HACKATHON_SUBMISSION.md) · [`docs/M0-VERIFICATION.md`](docs/M0-VERIFICATION.md)

**Owner blockers:** AWS CLI + credentials (no deploy without approval), Vega SDK/VVD, Alexa Developer Console linking.

## Monorepo layout

```
apps/parent-web   Next.js parent dashboard
apps/fire-tv      Browser 10-foot TV shell (+ Vega notes; VVD not installed yet)
apps/alexa        ASK custom skill + local intent simulator
services/api      HTTP API (local server + Lambda handler)
packages/shared   Types, Zod schemas, DynamoDB keys
packages/domain   Approvals, pairing, points, AI validation, audit
infra             AWS CDK v2 (synth OK; deploy gated)
curated-missions  Fallback adventure library
```

## Prerequisites

- Node.js 22+
- pnpm 9+ (workspace binary: `./.tools/pnpm-bin` if global install fails)
- Docker (optional) for DynamoDB Local
- AWS CLI + account (for cloud deploy — **not done without approval**)
- Vega Developer Tools (for Fire TV/Vega simulator demo video)

## Quick start (local vertical slice)

```bash
# From repo root
export PATH="$PWD/.tools/pnpm-bin:$PATH"   # if needed: use ./.tools/pnpm-bin directly
./.tools/pnpm-bin install
./.tools/pnpm-bin --filter @familyflow/shared build
./.tools/pnpm-bin --filter @familyflow/domain build

# Terminal 1 — API (in-memory store by default; real state machine)
./.tools/pnpm-bin --filter @familyflow/api start

# Terminal 2 — Parent dashboard
./.tools/pnpm-bin --filter @familyflow/parent-web dev
# open http://localhost:3000

# Terminal 3 — TV shell (NOT Vega VVD)
./.tools/pnpm-bin --filter @familyflow/fire-tv start
# open http://127.0.0.1:3200
```

Local auth (development only): `Authorization: Bearer local:local-parent-001`

### DynamoDB Local (optional)

```bash
docker run -d --name ff-ddb -p 8000:8000 amazon/dynamodb-local
export FAMILYFLOW_STORE=dynamodb
export DYNAMODB_ENDPOINT=http://127.0.0.1:8000
export AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local
./.tools/pnpm-bin --filter @familyflow/api start
```

## Environment variables

Copy `.env.example`. Important flags:

| Variable | Purpose |
|----------|---------|
| `FAMILYFLOW_MODE` | `local` \| `aws` |
| `FAMILYFLOW_STORE` | `memory` \| `dynamodb` |
| `ALLOW_LOCAL_DEV_AUTH` | Must be `false` in AWS |
| `BEDROCK_ENABLED` | Off by default; curated library used when unavailable |
| `COGNITO_*` | Required in AWS mode |

## Tests

```bash
./scripts/verify-environment.sh
./scripts/run-tests.sh
```

Never mark unexecuted tests as passed. Playwright E2E and Vega VVD tests are **not executed** until installed — see `docs/TEST_MATRIX.md`.

## Alexa

```bash
FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 \
  ./.tools/pnpm-bin --filter @familyflow/alexa simulate:local SuggestAdventure
```

See `apps/alexa/README.md` for Developer Console / account-linking limitations.

## AWS deploy (owner approval required)

```bash
# 1) Install AWS CLI, configure credentials, enable Bedrock model access if desired
# 2) Build API bundle
./.tools/pnpm-bin --filter @familyflow/api build
# 3) Synth only by default
cd infra && npx cdk synth
# 4) Explicit deploy after approval:
# npx cdk deploy FamilyFlowSandbox -c budgetEmail=you@example.com
```

`pnpm --filter @familyflow/infra deploy` is intentionally hard-gated.

### Estimated cost assumptions (sandbox)

| Resource | Assumption |
|----------|------------|
| DynamoDB on-demand | Low single-digit USD/month at hackathon traffic |
| Lambda + HTTP API | Pennies for demo usage |
| Cognito | Free tier typically covers demos |
| Bedrock | Pay-per-token; keep `BEDROCK_ENABLED=false` unless needed |
| Budget alarm | Default **$25/month** with 80% email alert |

Teardown: `npx cdk destroy FamilyFlowSandbox` (manual).

## Privacy (product)

- Parents see FamilyFlow missions, approvals, skill requests, rewards, and in-app audit events.
- No ads, data sales, public child profiles, or child-to-stranger chat.
- No exact birth dates; age bands only.
- Export + delete endpoints for household data.
- Retention defaults disclosed in Settings (audit/request days).
- **No COPPA / legal certification claims** without counsel review.

## Demo script

See [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md).

## License

MIT — see `LICENSE`.
