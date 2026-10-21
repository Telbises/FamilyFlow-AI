# FamilyFlow Security

## Threat model (hackathon scope)

| Threat | Mitigation |
|--------|------------|
| Cross-household data access | Ownership link + member checks on every mutating/read path |
| Forged parent identity | Cognito JWT verification (`aws-jwt-verify`); local tokens disabled in AWS mode |
| Pairing code brute force | 6-digit codes, short TTL, hashed at rest, rate limit on `/devices/pair` |
| Double approval / double points | Conditional DynamoDB updates; domain rejects non-pending |
| Replay of TV/Alexa requests | Idempotency keys |
| Prompt injection / unsafe AI | Constrained JSON schema, deny-list, curated fallback, parent approval |
| Secret leakage in logs | Audit metadata allowlist; no tokens/passwords in CloudWatch messages |
| Privilege escalation by child | Role checks; children cannot decide approvals |

## Auth modes

| Mode | When | Notes |
|------|------|-------|
| Cognito access JWT | AWS / production-like | `ALLOW_LOCAL_DEV_AUTH=false` |
| `Bearer local:<sub>` | Local development only | Bannered in UI; never enable in AWS |
| Device session | After TV pairing | Session id + secret; not a parent JWT |

## IAM (CDK)

- Lambda: read/write only FamilyFlow table; optional Bedrock invoke when enabled
- No wildcard admin policies beyond Bedrock model invoke (should be narrowed to model ARN after account known)

## Secrets

- Pairing codes hashed (SHA-256 with app pepper prefix)
- Cognito client is public SPA-style (no client secret in browser)
- No long-lived AWS keys in repo (`.env` gitignored)

## Required before real children / production

- Penetration test or structured security review
- Cognito MFA policy decision
- WAF / stricter rate limits on public pair endpoint
- Legal/privacy readiness review (see PRIVACY doc)
- Remove local auth paths entirely from deployed stacks

## Known gaps (honest)

- Live Cognito not deployed in this environment (no AWS credentials)
- Browser TV shell historically used parent local token for convenience; device session token is the intended path
- Playwright E2E and external simulator security runs not yet executed
