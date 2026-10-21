# Privacy and Child Safety

## Visibility promise (must be stated in product)

Parents can review **FamilyFlow activity only**: mission requests, approvals, completions, rewards, Alexa FamilyFlow skill requests logged by this backend, and in-app settings changes.

FamilyFlow does **not** claim or implement access to:

- Unrelated Alexa conversations
- Amazon purchase history
- Third-party Fire TV / Vega app usage
- Device telemetry outside FamilyFlow

## Age-appropriate disclosure

- Child profiles use **age bands** (3–6, 7–12, 13–17) — not exact birth dates.
- Creating a child requires `visibilityNoticeAcknowledged=true`.
- UI copy must tell children/parents that a parent can see FamilyFlow actions.

## Prohibited product behaviors

- No advertisements
- No data sales
- No public child profiles
- No child-to-stranger communication
- No manipulative / infinite engagement loops
- No covert monitoring

## AI processing

| Item | Practice |
|------|----------|
| What is sent to Bedrock | Constrained category + age bands + template prompt — not freeform child chat |
| Child identifiers | Avoid sending display names unless strictly necessary (current generate path does not send child names) |
| Retention (model provider) | Subject to AWS Bedrock / account region data handling; document in Settings when enabled |
| Fallback | Curated local library when Bedrock off/unavailable |
| Parent control | Feature flag `ai`; parent approval still required for play/rewards |

## Data rights (in-app)

- `POST /data/export` — household FamilyFlow export
- `POST /data/delete-request` — delete household items + user link
- Retention defaults disclosed via Settings (`audit` / `requests` days)
- Session revocation: device `revokedAt` (pairing flow)

## Legal posture

This repository documents **product behavior** for a hackathon prototype. It does **not** claim COPPA, PIPEDA, or other legal certification. **Do not onboard real children** before a separate privacy, security, and legal readiness review.
