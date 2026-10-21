# Simulator Test Guide

## A. Parent web + local API (available now)

```bash
./scripts/verify-environment.sh
./scripts/run-tests.sh
./.tools/pnpm-bin --filter @familyflow/api start
./.tools/pnpm-bin --filter @familyflow/parent-web dev
```

Open `http://localhost:3000`. Local token banner is expected.

Acceptance checklist:

1. Create household (if none)
2. Add child with age band + notice
3. Generate pairing code
4. Approve a mission request
5. Approve completion → points once
6. Activity timeline shows events
7. Settings shows privacy disclosure; export works

## B. Browser TV shell (API integration — not Vega)

```bash
./.tools/pnpm-bin --filter @familyflow/fire-tv start
# http://127.0.0.1:3200
```

1. Enter pairing code from dashboard
2. Browse mission board (arrows + Enter)
3. Request adventure → pending
4. Parent approves → refresh board status
5. Request completion → parent verifies

## C. Official Vega Virtual Device (required for Fire TV hackathon video)

**Prerequisite:** Install VDT per Amazon docs (Apple Silicon supported):

```bash
[[ $(arch) == "arm64" ]] && softwareupdate --install-rosetta --agree-to-license
brew update && brew install binutils coreutils gawk findutils grep jq lz4 gnu-sed watchman
curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash && source ~/vega/env
vega --version
vega virtual-device start --display-res=1920,1080
```

Then scaffold/port a React Native for Vega app using Amazon samples (`react-native-multi-tv-helloworld` / `vega-tv-interfaces-sample`) calling the same FamilyFlow API. **Do not claim the browser shell is VVD.**

## D. Alexa

### Local alternative (real API, not production)

```bash
FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 \
  ./.tools/pnpm-bin --filter @familyflow/alexa simulate:local SuggestAdventure
FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 \
  ./.tools/pnpm-bin --filter @familyflow/alexa simulate:local RequestAdventure
```

### Alexa Developer Console

1. Create skill; upload interaction model from `apps/alexa/skill-package`
2. Configure account linking to Cognito (after AWS deploy)
3. Test intents in Console simulator
4. Confirm request appears in parent Approvals

If Console account linking cannot be completed, document the limitation and use the local simulator route without calling it production-ready.
