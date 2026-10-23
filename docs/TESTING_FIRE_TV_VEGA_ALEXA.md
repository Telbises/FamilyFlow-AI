# Testing FamilyFlow on Fire TV / Vega / Alexa

## Quick automated E2E (API + device session + Alexa skill handlers)

Requires API running:

```bash
./.tools/pnpm-bin --filter @familyflow/api start
bash scripts/e2e-fire-tv-alexa.sh
```

Last documented result: `docs/E2E_FIRE_TV_ALEXA_RESULTS.md`.

---

## 1. Unified parent web

```bash
./.tools/pnpm-bin --filter @familyflow/parent-web dev
# http://localhost:3000  (prefer localhost for CORS)
```

Local demo auth banner uses `Bearer local:local-parent-001`. After AWS deploy, switch to Cognito and set `ALLOW_LOCAL_DEV_AUTH=false`.

Manual checklist: create household → add child (notice) → pairing code → approve → complete → rewards → activity → settings export.

---

## 2. Fire TV — browser 10-foot shell (API integration)

```bash
./.tools/pnpm-bin --filter @familyflow/fire-tv start
# http://127.0.0.1:3200
```

Enter pairing code from dashboard. Arrows + Enter = D-pad stand-in. Uses device session token after pair.

**Not** the official Vega Virtual Device.

---

## 3. Fire TV / Vega Virtual Device (official simulator)

```bash
# One-time install (Apple Silicon supported; ~20GB)
[[ $(arch) == "arm64" ]] && softwareupdate --install-rosetta --agree-to-license
brew update && brew install binutils coreutils gawk findutils grep jq lz4 gnu-sed watchman
curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash && source ~/vega/env
vega --version
vega virtual-device start --display-res=1920,1080
```

Build a Vega/React Native TV app from Amazon samples, configure `API_BASE_URL` to your FamilyFlow API, implement:

1. Pairing screen → `POST /devices/pair`  
2. Mission board → `GET /devices/{sessionId}/missions` with `Authorization: Bearer device:{id}:{token}`  
3. Request / complete-request → same API as shell  

Package as `.vpkg` and `vega run-app … -d VirtualDevice`.

---

## 4. Alexa custom skill (Developer Console)

```bash
# ASK CLI (workspace copy if installed)
./.tools/ask/node_modules/.bin/ask configure   # Amazon developer login
```

1. Create skill; import `apps/alexa/skill-package/.../en-US.json`.  
2. Account-link Cognito.  
3. Console simulator: “Alexa, open family flow” → suggest / request adventure.  
4. Confirm request in parent **Pending approvals**.

### Local Alexa (no Console)

```bash
FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 \
  ./.tools/pnpm-bin --filter @familyflow/alexa simulate:local SuggestAdventure
FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 \
  ./.tools/pnpm-bin --filter @familyflow/alexa simulate:local RequestAdventure
```

---

## 5. Alexa+ MCP (preview)

```bash
./.tools/pnpm-bin --filter @familyflow/alexa-plus-mcp start
# Exposes Streamable HTTP MCP tools against FAMILYFLOW_API_BASE_URL
```

Use with MCP-compatible clients / Alexa+ preview tooling per current Amazon docs. Not a substitute for Fire TV Appstore binary.

---

## 6. Bedrock suggestions

See `docs/BEDROCK_SETUP.md`. With `BEDROCK_ENABLED=true` and model access, use **Suggest an adventure** in the parent planner.
