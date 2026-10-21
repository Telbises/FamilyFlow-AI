# Test status log

Updated: 2026-10-20

| Suite | Command | Last result | Notes |
|-------|---------|-------------|-------|
| Domain unit | `pnpm --filter @familyflow/domain test` | **PASS** 18/18 | Roles, approvals, points, pairing, AI |
| API vertical slice | `pnpm --filter @familyflow/api test` | **PASS** 1/1 | Memory store; real state machine; idempotency; double-approve blocked; points once |
| Fire TV shell contract | `pnpm --filter @familyflow/fire-tv test` | **PASS** 3/3 | Static navigation contract |
| Alexa model | `pnpm --filter @familyflow/alexa test` | **PASS** 1/1 | Intent presence |
| Playwright parent E2E | not added yet | **Not executed** | Incomplete |
| Vega VVD navigation | requires Vega SDK | **Not executed** | Blocked on VDT install |
| Alexa Developer Console | requires Amazon account | **Not executed** | Use local simulator alternatively |

Never mark unexecuted tests as passed.
