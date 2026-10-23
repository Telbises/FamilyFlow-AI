# FamilyFlow AI

**Less scrolling. More living together.**

FamilyFlow is a family coordination and adventure product for the [Amazon Devices Hackathon 2026](https://amazonappdev2026.devpost.com/). Parents and kids browse age-banded adventures on the living-room screen, request them by Fire TV / Vega or Alexa, and parents approve every sensitive step in one **unified web dashboard**. Completions unlock **non-purchasable** family rewards. Optional **Amazon Bedrock** suggestions stay parent-reviewable and never bypass approval.

**Privacy boundary:** Parents see **FamilyFlow activity only** — not unrelated Alexa conversations, Amazon purchases, or third-party Fire TV apps.

**GitHub:** https://github.com/Telbises/FamilyFlow-AI  

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Parent unified web | Next.js App Router, Tailwind CSS, TypeScript |
| Living-room client | Fire TV / Vega OS target; browser 10-ft shell for API/D-pad integration; official VVD for simulator demo |
| Voice | Alexa custom skill (ASK SDK) + Alexa+ MCP preview server |
| API | AWS API Gateway HTTP API → Lambda (Node.js 22) |
| Auth | Amazon Cognito (parents); hashed TV pairing codes + device session tokens |
| Data | DynamoDB single-table (on-demand) |
| AI | Amazon Bedrock Converse (JSON schema + safety checks) + curated fallback library |
| Infra | AWS CDK v2, CloudWatch logs, AWS Budgets |
| Monorepo | pnpm workspaces, TypeScript |
| Local demo | In-memory or DynamoDB Local; `Bearer local:…` **dev only** |

---

## Workflow diagram

```mermaid
flowchart LR
  subgraph Clients
    WEB[Parent Web<br/>Next.js]
    TV[Fire TV / Vega<br/>or 10-ft shell]
    AX[Alexa ASK Skill]
    MCP[Alexa+ MCP]
  end

  subgraph AWS
    APIGW[API Gateway HTTP API]
    COG[Cognito JWT]
    LAMBDA[Lambda Node 22]
    DDB[(DynamoDB)]
    BR[Bedrock]
    CW[CloudWatch]
  end

  WEB -->|JWT| APIGW
  TV -->|device session Bearer| APIGW
  AX -->|account-linked token| APIGW
  MCP -->|access token| APIGW
  APIGW --> COG
  APIGW --> LAMBDA
  LAMBDA --> DDB
  LAMBDA -->|optional| BR
  LAMBDA --> CW
```

### Happy-path sequence

```mermaid
sequenceDiagram
  participant Kid as Child TV / Alexa
  participant API as FamilyFlow API
  participant Parent as Parent Web
  participant AI as Bedrock optional

  Parent->>API: Create household + child profiles
  Parent->>API: Generate pairing code
  Kid->>API: Pair TV with code
  Parent->>AI: Suggest adventure JSON
  AI-->>Parent: Plan labeled AI or curated
  Kid->>API: Request adventure pending
  Parent->>API: Approve request
  Kid->>API: See approved mission on TV
  Kid->>API: Request completion
  Parent->>API: Verify completion → points once
  Parent->>API: View audit timeline
```

---

## Monorepo layout

```
apps/parent-web       Unified parent dashboard (approvals, planner, Bedrock suggest, privacy)
apps/fire-tv          10-foot TV shell + Vega publish notes
apps/alexa            ASK custom skill + local simulator
apps/alexa-plus-mcp   MCP server for Alexa+ / agentic preview
services/api          HTTP API (local + Lambda)
packages/shared       Types, Zod schemas, DynamoDB keys
packages/domain       Approvals, pairing, points-once, AI safety, audit sanitize
infra                 CDK: Cognito, DynamoDB, HTTP API, Lambda, budget
curated-missions      Safe fallback adventure library
docs/                 Architecture, security, privacy, publish, Bedrock, testing
scripts/              verify-environment, run-tests, e2e-fire-tv-alexa
```

---

## Quick start (local)

```bash
./.tools/pnpm-bin install          # or: pnpm install
./.tools/pnpm-bin --filter @familyflow/shared build
./.tools/pnpm-bin --filter @familyflow/domain build

# Terminal 1 — API
./.tools/pnpm-bin --filter @familyflow/api start

# Terminal 2 — Parent web  → http://localhost:3000
./.tools/pnpm-bin --filter @familyflow/parent-web dev

# Terminal 3 — TV shell     → http://127.0.0.1:3200
./.tools/pnpm-bin --filter @familyflow/fire-tv start
```

Local auth (development only): `Authorization: Bearer local:local-parent-001`

---

## Testing Fire TV / Vega / Alexa

| Path | How |
|------|-----|
| Automated E2E | `bash scripts/e2e-fire-tv-alexa.sh` (API + device session + Alexa handlers) |
| Unit / domain | `bash scripts/run-tests.sh` |
| Fire TV browser shell | `:3200` after pair code from dashboard |
| **Vega Virtual Device** | Install VDT → `vega virtual-device start` → run Vega-packaged app (see below) |
| **Alexa Developer Console** | `ask configure` → import skill model → account link Cognito → Console simulator |
| Alexa local | `pnpm --filter @familyflow/alexa simulate:local RequestAdventure` |
| Alexa+ MCP | `pnpm --filter @familyflow/alexa-plus-mcp start` → `http://127.0.0.1:3300/mcp` |
| Bedrock | Enable model access → `BEDROCK_ENABLED=true` → Suggest in planner |

Full guide: [`docs/TESTING_FIRE_TV_VEGA_ALEXA.md`](docs/TESTING_FIRE_TV_VEGA_ALEXA.md)

### Vega Virtual Device (official Fire TV simulator)

```bash
curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash && source ~/vega/env
vega virtual-device start --display-res=1920,1080
```

Port FamilyFlow TV UI from Amazon RN-TV / Vega samples; call the same pairing + mission APIs. Details: [`docs/AMAZON_PUBLISH_GUIDE.md`](docs/AMAZON_PUBLISH_GUIDE.md).

---

## Amazon Bedrock (valuable family suggestions)

1. AWS Console → Bedrock → request model access (e.g. Nova Lite in your region).  
2. Set `BEDROCK_ENABLED=true`, `BEDROCK_MODEL_ID`, `BEDROCK_REGION`.  
3. Parent planner → **Suggest an adventure** → labeled AI or curated fallback.  
4. Child still needs **request + parent approval**; rewards need **completion approval**.

Guide: [`docs/BEDROCK_SETUP.md`](docs/BEDROCK_SETUP.md)

---

## AWS deploy (your account)

```bash
# Install AWS CLI, aws configure, enable Bedrock if desired
./.tools/pnpm-bin --filter @familyflow/api build
cd infra && npx cdk synth
npx cdk deploy FamilyFlowSandbox -c budgetEmail=you@example.com
```

Costs / teardown: [`docs/AWS_COSTS_AND_TEARDOWN.md`](docs/AWS_COSTS_AND_TEARDOWN.md)  
**Do not deploy without reviewing budget.** Default alarm: $25/month.

---

## Publish to Amazon Developer

| Product | Doc |
|---------|-----|
| Fire TV / Vega Appstore | [`docs/AMAZON_PUBLISH_GUIDE.md`](docs/AMAZON_PUBLISH_GUIDE.md) §A |
| Alexa ASK skill | §B |
| Alexa+ MCP | §C |
| Parent web hosting | §D |

---

## Documentation index

| Doc | Purpose |
|-----|---------|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design |
| [`docs/SECURITY.md`](docs/SECURITY.md) | AuthZ, pairing, threats |
| [`docs/PRIVACY_AND_CHILD_SAFETY.md`](docs/PRIVACY_AND_CHILD_SAFETY.md) | Visibility & child safety |
| [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) | 30-step status |
| [`docs/TEST_MATRIX.md`](docs/TEST_MATRIX.md) | Automated vs not executed |
| [`docs/E2E_FIRE_TV_ALEXA_RESULTS.md`](docs/E2E_FIRE_TV_ALEXA_RESULTS.md) | Latest E2E results |
| [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) | Honest gaps |
| [`docs/HACKATHON_SUBMISSION.md`](docs/HACKATHON_SUBMISSION.md) | Devpost package |

---

## Privacy (product commitments)

- No ads, data sales, public child profiles, or child-to-stranger chat  
- Age bands only (no exact birth dates)  
- Export / delete / feature flags / session revocation  
- **Not** a COPPA or legal certification claim without counsel review  
- Do not onboard real children before privacy/security/legal readiness review  

---

## License

MIT — see [`LICENSE`](LICENSE).
