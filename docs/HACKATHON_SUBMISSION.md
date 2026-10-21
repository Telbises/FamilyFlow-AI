# Hackathon Submission Package — FamilyFlow AI

**Track:** Fire TV (primary) + AWS Builder (mini-challenge)  
**Tagline:** Less scrolling. More living together.  
**Repo:** https://github.com/Telbises/FamilyFlow-AI  
**License:** MIT  

## One-paragraph description

FamilyFlow helps families spend time together instead of doomscrolling. Kids browse age-banded adventures on the living-room screen or ask the FamilyFlow Alexa skill; parents approve every sensitive step in a calm web dashboard; completions unlock non-purchasable family rewards. Parents only see FamilyFlow activity — not unrelated Alexa chats or Amazon account data.

## Demo video plan (≤3 min)

Follow `docs/DEMO-SCRIPT.md`. Prefer Vega Virtual Device or Fire TV for the TV segment once VDT is installed; until then do not imply OS certification for the browser shell.

## Product feedback (draft)

| Tool | Used for | Worked | Needs work |
|------|----------|--------|------------|
| AWS CDK / Lambda / DynamoDB / Cognito | Backend | Clear patterns | Local Cognito bootstrap friction without CLI |
| Bedrock | Adventure JSON | Schema path ready | Model access + cost gating |
| Vega / VVD | Fire TV target | Docs clear for M-series | Full SDK install not yet done on this host |
| ASK SDK | Voice requests | Local invoke works | Console account linking TBD |

## Friction log (seed)

| Task | Expected | Actual | Severity | Suggestion |
|------|----------|--------|----------|------------|
| Install AWS CLI via Homebrew | Simple brew install | Homebrew dir ownership blocked without sudo | High | Document non-brew install path |
| Claim Fire TV ready | VVD available | Vega not installed | High | Earlier VDT install checklist |

## Collaborators for private review (if needed)

`knmeiss`, `giolaq`, `anishamalde`, `mosesroth`, `emersonsklar` (+ Devpost testing email per rules)

## Acceptance evidence status

See `docs/IMPLEMENTATION_STATUS.md` and `docs/TEST_MATRIX.md`. Release candidate is **not** production-ready for real children until AWS deploy, VVD acceptance, security pass, and privacy/legal review complete.
