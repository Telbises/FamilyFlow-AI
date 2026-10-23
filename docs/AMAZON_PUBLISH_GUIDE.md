# Publishing FamilyFlow on Amazon Developer

This guide maps FamilyFlow surfaces to Amazon developer consoles. Follow each product’s current official docs before submitting — policies change.

**Developer console:** https://developer.amazon.com/  

FamilyFlow is a **multi-surface** product with one backend:

| Surface | Amazon product | Submission target |
|---------|----------------|-------------------|
| Living-room client | Fire TV / Vega OS | Amazon Appstore (Fire TV) |
| Voice | Alexa custom skill (ASK) and/or Alexa+ MCP | Alexa Developer Console |
| Parent dashboard | Web (Cognito-hosted) | Not Appstore; host on HTTPS (CloudFront/Amplify/your domain) |
| AI | Amazon Bedrock | AWS account model access (not a store listing) |

## Prerequisites (all tracks)

1. Amazon Developer account (same login can cover Appstore + Alexa).
2. AWS account for Cognito, API Gateway, Lambda, DynamoDB, Bedrock (see `BEDROCK_SETUP.md` and `AWS_COSTS_AND_TEARDOWN.md`).
3. Deploy FamilyFlow API (`infra` CDK) with `ALLOW_LOCAL_DEV_AUTH=false`.
4. Privacy copy live in-app: FamilyFlow-only visibility; no COPPA certification claims without counsel.

---

## A. Fire TV / Vega OS (Appstore)

### What to submit

A demo-ready app that runs on **Fire OS or Vega OS**. FamilyFlow’s production path:

1. Install [Vega Developer Tools](https://developer.amazon.com/docs/vega/0.22/install-vega-sdk.html) on Apple Silicon.
2. Scaffold or port from Amazon samples (`react-native-multi-tv-helloworld`, `vega-tv-interfaces-sample`).
3. Point the app at your deployed API (`API_BASE_URL`).
4. Use **device pairing** (`POST /devices/pair` → `Bearer device:…`) — never embed parent passwords on the TV.
5. Test on **Vega Virtual Device**, then a physical Fire TV Stick before Appstore submission (Amazon requires device testing for store).

### Appstore checklist (high level)

- [ ] Developer identity / tax / payout complete in Amazon Developer Console  
- [ ] App binary (Vega `.vpkg` or Fire OS package per current console requirements)  
- [ ] Content rating / target age bands disclosed accurately  
- [ ] Privacy policy URL (FamilyFlow-only visibility language)  
- [ ] Screenshots / video on Fire TV or VVD  
- [ ] No unauthorized child data collection; age bands only  
- [ ] Test accounts for reviewers (parent Cognito user + pairing flow notes)

### Interim (hackathon demo)

Browser 10-foot shell (`apps/fire-tv`) validates API + D-pad UX. **Do not list it as a Vega OS Appstore binary.** For Devpost, show VVD or a real Fire TV.

---

## B. Alexa custom skill (ASK)

1. Create skill in [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask).  
2. Upload interaction model from `apps/alexa/skill-package/interactionModels/custom/en-US.json`.  
3. Endpoint: HTTPS Lambda or skill adapter calling FamilyFlow API.  
4. **Account linking** to Cognito (OAuth) so `accessToken` maps to household — never authenticate by spoken child name.  
5. Test in Console simulator → confirm pending approval in parent web.  
6. Certification: follow Alexa skill certification checklist (invocation name, privacy, account linking).

Local alternative (not production): `pnpm --filter @familyflow/alexa simulate:local …`

---

## C. Alexa+ (Agent Skill / MCP) — optional track

Hackathon Alexa+ expects MCP (spec ≥ 2025-11-25) or Agent Skill over Streamable HTTP, or a clearly labeled simulated Alexa+ experience.

FamilyFlow includes `apps/alexa-plus-mcp` as a **starter MCP server** that exposes household-safe tools (suggest/list/request adventure) against the same API with linked-token auth.  

- Treat it as **preview / hackathon** until you complete Amazon’s current Alexa+ partner onboarding.  
- Parent approval remains mandatory for sensitive actions.

---

## D. Unified parent web

Host `apps/parent-web` on HTTPS with Cognito Hosted UI / Amplify:

- Overview, approvals, planner, children, rewards, activity, settings  
- Feature flags for voice / AI / rewards / pairing  
- Export / delete for household data  

Same Cognito user pool as Alexa account linking and API JWT authorizer.

---

## E. Before real families

- Separate privacy, security, and legal readiness review  
- No ads, data sales, stranger chat, or covert monitoring  
- Bedrock: no freeform child chat; constrained templates only  

See `PRIVACY_AND_CHILD_SAFETY.md` and `SECURITY.md`.
