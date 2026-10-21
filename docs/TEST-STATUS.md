# Test status log

Updated: 2026-10-20 (post Step 1 discovery + docs + device session auth)

| Suite | Command | Last result | Notes |
|-------|---------|-------------|-------|
| Environment | `scripts/verify-environment.sh` | Ran | AWS/Vega/ASK warnings expected |
| Domain unit | `pnpm --filter @familyflow/domain test` | **PASS** 21/21 | Includes audit sanitization |
| API vertical slice | `pnpm --filter @familyflow/api test` | **PASS** 1/1 | Includes device session token auth |
| Fire TV shell | `pnpm --filter @familyflow/fire-tv test` | **PASS** 3/3 | |
| Alexa model | `pnpm --filter @familyflow/alexa test` | **PASS** 1/1 | |
| `scripts/run-tests.sh` | all of above | **PASS** | |
| Playwright / VVD / Alexa Console | — | **Not executed** | See TEST_MATRIX |

Never mark unexecuted tests as passed.
