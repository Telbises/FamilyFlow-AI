# FamilyFlow Architecture

## Product boundary

FamilyFlow coordinates **in-app** family adventures across:

- Parent web dashboard (Next.js)
- Living-room TV client (Fire TV / Vega target; browser 10-ft shell until VVD installed)
- Alexa custom skill (ASK SDK)

Parents see FamilyFlow activity only. The system does **not** access unrelated Alexa conversations, Amazon purchases, or third-party Fire TV apps.

## Runtime diagram

```
Parent Web ──┐
Fire TV ─────┼──► API Gateway HTTP API ──► Lambda (Node 22) ──► DynamoDB
Alexa Skill ─┘         │                         │
                       │ JWT (Cognito)            ├── Cognito User Pool (parents)
                       │ or device session        ├── Bedrock (optional, gated)
                       └──────────────────────────┴── CloudWatch logs (redacted)
```

## Packages

| Path | Role |
|------|------|
| `packages/shared` | Types, Zod schemas, DynamoDB key design, errors |
| `packages/domain` | Approvals, pairing, points-once, AI validation, audit sanitize |
| `services/api` | HTTP router, repositories, Cognito JWT verify, Bedrock invoke |
| `apps/parent-web` | Parent dashboard |
| `apps/fire-tv` | 10-ft TV client (browser shell + Vega notes) |
| `apps/alexa` | ASK skill + local simulator |
| `infra` | CDK: Cognito, DynamoDB, HTTP API, Lambda, budget |

## Data model (household-scoped single table)

PK `HOUSEHOLD#{id}` with SK entities: `META`, `MEMBER#`, `MISSION#`, `REQUEST#`, `COMPLETION#`, `REWARD#`, `AUDIT#`, `DEVICE#`, `POINTS`, `IDEM#`.

GSI1: pending approvals. GSI2: pairing hash lookup (pre-pair only).

## AuthZ rules

1. Parent Cognito (or local Bearer in dev) owns household via `USER#{sub}` link.
2. Never trust client-supplied household IDs without membership/ownership check.
3. Children cannot decide approvals or completion rewards.
4. Device pairing uses short-lived hashed codes; post-pair uses session credentials.
5. Alexa uses linked account token — never spoken names as auth.

## State machine (missions)

`available` → `requested` → `approved`|`rejected` → (`in_progress`) → `completion_requested` → `completed`  
Points awarded **once** via conditional write on `pointsAwarded = 0`.

## AI path

Bedrock returns JSON validated by Zod + safety deny-list. Failures fall back to curated library. Outputs are labeled. Child freeform chat is not supported. Parent approval remains mandatory for activation and rewards.
