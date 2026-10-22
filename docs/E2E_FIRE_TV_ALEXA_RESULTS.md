# E2E Test Results — Fire TV + Alexa

**Date:** 2026-10-21  
**Host:** Apple Silicon M2 Mac Mini  
**Script:** `scripts/e2e-fire-tv-alexa.sh`

## Executive verdict

| Surface | What ran | Result |
|---------|----------|--------|
| FamilyFlow API + device (TV) session | Automated pairing → board → approve → complete → points once → audit | **PASS (17/17)** |
| Alexa skill handlers | Local ASK invoke (`simulate:local`) against live API | **PASS** |
| Official **Vega Virtual Device** / Fire TV emulator | Not installed (`vega` missing; no Android `emulator`/`adb`) | **NOT EXECUTED** |
| **Alexa Developer Console** / `ask dialog` | ASK CLI not configured (needs Amazon developer login) | **NOT EXECUTED** |

This is a **real** backend + skill + device-auth E2E. It is **not** a claim that Amazon’s Fire TV/Vega GUI emulator or the Alexa Console simulator were used.

## Commands executed

```bash
./.tools/pnpm-bin --filter @familyflow/api start
bash scripts/e2e-fire-tv-alexa.sh
```

## Passing steps (this run)

1. API health  
2. Household create  
3. Child profile (age band + visibility notice)  
4. TV pairing code → device session token  
5. Device `/devices/me` lists child  
6. TV mission board via device bearer  
7. Alexa `SuggestAdventure` speech response  
8. Alexa `RequestAdventure` → pending parent approval (same backend)  
9. Parent approve → mission `approved`  
10. TV board reflects approved status  
11. Completion request → parent verify → points  
12. Double-award blocked  
13. Audit: `mission.requested`, `mission.request_decided`, `device.paired`

## Blockers for official emulators

### Fire TV / Vega Virtual Device

```text
vega not found
adb / Android emulator not found
~/vega absent
```

**Owner action (official path):**

```bash
[[ $(arch) == "arm64" ]] && softwareupdate --install-rosetta --agree-to-license
brew update && brew install binutils coreutils gawk findutils grep jq lz4 gnu-sed watchman
curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash && source ~/vega/env
vega virtual-device start --display-res=1920,1080
# Then run a Vega-packaged FamilyFlow app against the API
```

Browser TV shell remains at `http://127.0.0.1:3200` for 10-ft UX checks only.

### Alexa Developer Console

**Owner action:**

```bash
npm install -g ask-cli   # or use workspace .tools/ask after install
ask configure            # Amazon developer account browser login
# Create/link skill; upload apps/alexa/skill-package interaction model
ask dialog --locale en-US
```

Until then, use:

```bash
FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 \
  ./.tools/pnpm-bin --filter @familyflow/alexa simulate:local RequestAdventure
```

## Security notes from this run

- TV used `Bearer device:<sessionId>:<sessionToken>` (not parent JWT)  
- Alexa requests required linked/local household token (no spoken-name auth)  
- Parent approval required before activation and before points  
- Points awarded once (replay conflict observed)

## Re-run

```bash
# Terminal 1
./.tools/pnpm-bin --filter @familyflow/api start
# Terminal 2
bash scripts/e2e-fire-tv-alexa.sh
```
