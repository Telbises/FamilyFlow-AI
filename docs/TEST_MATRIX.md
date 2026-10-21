# Test Matrix

| ID | Area | Case | Automation | Last result |
|----|------|------|------------|-------------|
| D1 | Roles | Parent required for approvals | domain unit | PASS |
| D2 | Roles | Child visibility notice required | domain unit | PASS |
| D3 | Approvals | Pending → approved/rejected; no double decide | domain unit | PASS |
| D4 | Pairing | Hash, expiry, revoke | domain unit | PASS |
| D5 | Points | Award once; reward thresholds | domain unit | PASS |
| D6 | AI | Schema + unsafe reject + curated fallback | domain unit | PASS |
| D7 | Audit | Metadata sanitization (no email-like / unknown keys) | domain unit | See suite |
| A1 | Vertical slice | Request→approve→complete→points once→audit | api test | PASS |
| A2 | Idempotency | Replay same key returns same request | api test | PASS |
| A3 | Concurrent approve | Second decision conflicts | api test | PASS |
| A4 | Cross-household | Other parent cannot decide | api test | PASS |
| A5 | Bad pairing code | Rejected | api test | PASS |
| TV1 | Shell contract | Three views + D-pad keys + non-Vega banner | fire-tv test | PASS |
| AX1 | Interaction model | Required intents present | alexa test | PASS |
| AX2 | Local simulator | Suggest/Request against live API | manual/`simulate:local` | Manual |
| E2E1 | Playwright parent | Full dashboard happy path | **Not executed** | Incomplete |
| VVD1 | Vega Virtual Device | Navigation + pair + status | **Not executed** | BLOCKED (no SDK) |
| CON1 | Alexa Developer Console | Account-linked request | **Not executed** | BLOCKED/unconfigured |
| SEC1 | Unauthorized API | Missing bearer → 401 | expand | Partial via auth module |
| SEC2 | Feature flags | Disabled pairing/AI/voice | expand | Partial |

Never mark unexecuted rows as PASS.
