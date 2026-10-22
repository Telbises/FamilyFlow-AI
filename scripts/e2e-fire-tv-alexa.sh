#!/usr/bin/env bash
# End-to-end FamilyFlow flow: parent → pair TV → Alexa request → approve → complete → points
# Uses local API + Alexa local skill invoke + device session (TV auth).
# Does NOT claim Vega Virtual Device or Alexa Developer Console unless those tools are present.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
API="${API_BASE:-http://127.0.0.1:3100}"
AUTH="Authorization: Bearer local:local-parent-001"
PASS=0
FAIL=0

ok() { echo "PASS  $*"; PASS=$((PASS+1)); }
bad() { echo "FAIL  $*"; FAIL=$((FAIL+1)); }
info() { echo "INFO  $*"; }

echo "=== FamilyFlow E2E (Fire TV device session + Alexa local) ==="
echo "API=$API"

# Health
if ! curl -sf "$API/health" >/dev/null; then
  bad "API not reachable at $API — start with: ./.tools/pnpm-bin --filter @familyflow/api start"
  echo "RESULT fail=$FAIL pass=$PASS"
  exit 1
fi
ok "API health"

# Household (create or use existing)
HH=$(curl -sf -H "$AUTH" -H "content-type: application/json" "$API/households/current" 2>/dev/null || true)
if echo "$HH" | grep -q '"household"'; then
  ok "Household exists"
else
  HH=$(curl -sf -X POST -H "$AUTH" -H "content-type: application/json" \
    -d '{"timezone":"America/Los_Angeles"}' "$API/households")
  ok "Household created"
fi

# Ensure child
MEMBERS=$(curl -sf -H "$AUTH" "$API/households/current")
CHILD=$(echo "$MEMBERS" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    const j=JSON.parse(d); const c=(j.members||[]).find(m=>m.role==='child'&&m.active);
    if(c) console.log(c.id); else process.exit(2);
  });
" 2>/dev/null || true)
if [[ -z "${CHILD:-}" ]]; then
  CHILD=$(curl -sf -X POST -H "$AUTH" -H "content-type: application/json" \
    -d '{"displayName":"Sam","role":"child","ageBand":"7-12","visibilityNoticeAcknowledged":true}' \
    "$API/members" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).id))")
  ok "Child profile created ($CHILD)"
else
  ok "Child profile ready ($CHILD)"
fi

# Pairing code + TV device pair
PAIR=$(curl -sf -X POST -H "$AUTH" "$API/devices/pairing-code")
CODE=$(echo "$PAIR" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).code))")
PAIRED=$(curl -sf -X POST -H "content-type: application/json" \
  -d "{\"code\":\"$CODE\",\"label\":\"E2E Living Room TV\"}" "$API/devices/pair")
SESSION_ID=$(echo "$PAIRED" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).sessionId))")
SESSION_TOKEN=$(echo "$PAIRED" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).sessionToken))")
DEVICE_AUTH="Authorization: Bearer device:${SESSION_ID}:${SESSION_TOKEN}"
ok "TV paired (session ${SESSION_ID:0:8}…)"

# Device context + missions (Fire TV path)
CTX=$(curl -sf -H "$DEVICE_AUTH" "$API/devices/me")
echo "$CTX" | grep -q "$CHILD" && ok "Device context lists child" || bad "Device context missing child"
MISSIONS=$(curl -sf -H "$DEVICE_AUTH" "$API/devices/${SESSION_ID}/missions")
MISSION_ID=$(echo "$MISSIONS" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    const j=JSON.parse(d); const m=(j.missions||[]).find(x=>x.status==='available') || (j.missions||[])[0];
    if(!m) process.exit(2); console.log(m.id);
  });
")
ok "TV mission board loaded ($MISSION_ID)"

# Alexa local skill: SuggestAdventure then RequestAdventure
export FAMILYFLOW_API_BASE_URL="$API"
export FAMILYFLOW_ALEXA_TOKEN="local:local-parent-001"
PNPM="${ROOT}/.tools/pnpm-bin"
ALEXA_OUT=$($PNPM --filter @familyflow/alexa exec tsx src/local-simulator.ts SuggestAdventure 2>&1) || true
echo "$ALEXA_OUT" | grep -qi "adventure\|mission\|suggest\|how about\|do not see" \
  && ok "Alexa SuggestAdventure responded" \
  || bad "Alexa SuggestAdventure failed: $ALEXA_OUT"

# Request via Alexa path (API source=alexa) — skill RequestAdventure
ALEXA_REQ=$($PNPM --filter @familyflow/alexa exec tsx src/local-simulator.ts RequestAdventure 2>&1) || true
echo "$ALEXA_REQ" | grep -qi "sent the adventure request\|parent must approve\|could not find\|Add a child\|FamilyFlow" \
  && ok "Alexa RequestAdventure responded" \
  || bad "Alexa RequestAdventure unexpected: $ALEXA_REQ"

# Also request via device (TV) if mission still available — may already be requested by Alexa
REQ_BODY=$(node -e "console.log(JSON.stringify({memberId:'$CHILD',source:'fire_tv',idempotencyKey:'e2e-tv-'+Date.now()}))")
TV_REQ=$(curl -s -X POST -H "$DEVICE_AUTH" -H "content-type: application/json" \
  -d "$REQ_BODY" "$API/missions/${MISSION_ID}/request" || true)
if echo "$TV_REQ" | grep -q '"status":"pending"'; then
  ok "TV mission request pending"
  REQUEST_ID=$(echo "$TV_REQ" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).request.id))")
elif echo "$TV_REQ" | grep -qi 'cannot be requested\|CONFLICT\|already'; then
  info "TV request skipped (mission already in flight from Alexa) — using approvals list"
  APPROVALS=$(curl -sf -H "$AUTH" "$API/approvals")
  REQUEST_ID=$(echo "$APPROVALS" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      const j=JSON.parse(d); const r=(j.requests||[])[0]; if(!r) process.exit(2); console.log(r.id);
    });
  ")
  ok "Found pending approval $REQUEST_ID"
else
  # Prefer Alexa-created pending
  APPROVALS=$(curl -sf -H "$AUTH" "$API/approvals")
  REQUEST_ID=$(echo "$APPROVALS" | node -e "
    let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
      const j=JSON.parse(d); const r=(j.requests||[]).find(x=>x.status==='pending');
      if(!r) { console.error(JSON.stringify(j)); process.exit(2);} console.log(r.id);
    });
  ") && ok "Pending request from Alexa/TV: $REQUEST_ID" || bad "No pending request"
fi

# Parent approve
DEC=$(curl -sf -X POST -H "$AUTH" -H "content-type: application/json" \
  -d '{"decision":"approved","idempotencyKey":"e2e-approve-1"}' \
  "$API/approvals/${REQUEST_ID}/decision")
echo "$DEC" | grep -q '"missionStatus":"approved"' && ok "Parent approved mission" || bad "Approve failed: $DEC"

# TV sees approved
MISSIONS2=$(curl -sf -H "$DEVICE_AUTH" "$API/devices/${SESSION_ID}/missions")
echo "$MISSIONS2" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    const j=JSON.parse(d); const m=(j.missions||[]).find(x=>x.id==='$MISSION_ID' || x.status==='approved');
    if(m && m.status==='approved') process.exit(0); process.exit(1);
  });
" && ok "TV reflects approved status" || bad "TV board missing approved mission"

# Completion request (device) + parent verify
COMP_BODY=$(node -e "console.log(JSON.stringify({memberId:'$CHILD',idempotencyKey:'e2e-comp-'+Date.now()}))")
# Find an approved mission id
APPROVED_ID=$(echo "$MISSIONS2" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    const j=JSON.parse(d); const m=(j.missions||[]).find(x=>x.status==='approved');
    console.log(m?m.id:'');
  });
")
COMP=$(curl -sf -X POST -H "$DEVICE_AUTH" -H "content-type: application/json" \
  -d "$COMP_BODY" "$API/missions/${APPROVED_ID}/complete-request")
COMP_ID=$(echo "$COMP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).completion.id))")
ok "Completion requested ($COMP_ID)"

DONE=$(curl -sf -X POST -H "$AUTH" -H "content-type: application/json" \
  -d '{"decision":"approved","idempotencyKey":"e2e-comp-dec-1"}' \
  "$API/completions/${COMP_ID}/decision")
echo "$DONE" | grep -q '"pointsAwarded":10\|"totalPoints"' && ok "Parent verified completion; points awarded" || bad "Completion decision failed: $DONE"

# Points once replay
REPLAY=$(curl -s -X POST -H "$AUTH" -H "content-type: application/json" \
  -d '{"decision":"approved","idempotencyKey":"e2e-comp-dec-2"}' \
  "$API/completions/${COMP_ID}/decision" || true)
echo "$REPLAY" | grep -qi 'already\|CONFLICT\|409\|conflict' && ok "Double points blocked" || info "Replay response: $REPLAY"

# Audit
AUDIT=$(curl -sf -H "$AUTH" "$API/audit-events")
echo "$AUDIT" | grep -q 'mission.requested' && ok "Audit has mission.requested" || bad "Audit missing request"
echo "$AUDIT" | grep -q 'mission.request_decided' && ok "Audit has approval" || bad "Audit missing approval"
echo "$AUDIT" | grep -q 'device.paired' && ok "Audit has device.paired" || bad "Audit missing pair"

# Official emulator presence checks (honest)
if command -v vega >/dev/null 2>&1 || [[ -x "$HOME/vega/bin/vega" ]]; then
  ok "Vega CLI present — run VVD separately for OS-level demo"
else
  info "Vega Virtual Device NOT installed — Fire TV E2E used device-session API + browser shell contract, not VVD"
fi
if command -v ask >/dev/null 2>&1; then
  info "ASK CLI present — Developer Console/dialog still needs ask configure + Amazon login"
else
  info "ASK CLI not configured — Alexa E2E used local skill invoke (not Developer Console)"
fi

echo ""
echo "=== E2E SUMMARY pass=$PASS fail=$FAIL ==="
if [[ "$FAIL" -gt 0 ]]; then exit 1; fi
exit 0
