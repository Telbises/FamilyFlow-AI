# Hackathon Submission Package — FamilyFlow AI

**Track:** Fire TV (primary) + AWS Builder (mini-challenge)  
**Tagline:** Less scrolling. More living together.  
**Repo:** https://github.com/Telbises/FamilyFlow-AI  
**License:** MIT  

## One-paragraph description

FamilyFlow helps families spend time together instead of doomscrolling. Kids browse age-banded adventures on the living-room screen or ask the FamilyFlow Alexa skill; parents approve every sensitive step in a calm web dashboard; completions unlock non-purchasable family rewards. Parents only see FamilyFlow activity — not unrelated Alexa chats or Amazon account data.

## Demo video plan (≤3 min)

Follow `docs/DEMO-SCRIPT.md`. Prefer Vega Virtual Device or Fire TV for the TV segment once VDT is installed; until then do not imply OS certification for the browser shell.

## Surfaces for judges

- **Fire TV track:** Living-room mission board + pairing + parent approval (VVD or device for video)
- **AWS Builder:** Cognito, API Gateway, Lambda, DynamoDB, Bedrock (optional), CDK
- **Alexa / Alexa+:** ASK skill + MCP preview server (parent approval never bypassed)

## Product feedback (draft)

| Tool | Used for | Worked | Needs work |
|------|----------|--------|------------|
| AWS CDK / Lambda / DynamoDB / Cognito | Backend | Clear patterns | Local Cognito bootstrap friction without CLI |
| Bedrock | Adventure JSON | Schema + curated fallback | Model access + cost gating on each account |
| Vega / VVD | Fire TV target | Docs clear for M-series | Full SDK install required on demo machine |
| ASK SDK | Voice requests | Local invoke + E2E harness | Console account linking per developer |
| MCP SDK | Alexa+ preview tools | Tool contracts + Streamable HTTP server | Partner onboarding / Console wiring |

## Friction log (seed)

| Task | Expected | Actual | Severity | Suggestion |
|------|----------|--------|----------|------------|
| Install AWS CLI via Homebrew | Simple brew install | Homebrew dir ownership blocked without sudo | High | Document non-brew install path |
| Claim Fire TV ready | VVD available | Vega not installed | High | Earlier VDT install checklist |

## Collaborators for private review (if needed)

`knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar` (+ Devpost testing email per rules)

## Acceptance evidence status

See `docs/IMPLEMENTATION_STATUS.md` and `docs/TEST_MATRIX.md`. Release candidate is **not** production-ready for real children until AWS deploy, VVD acceptance, security pass, and privacy/legal review complete.
