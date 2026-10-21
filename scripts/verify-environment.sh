#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ok() { echo "OK  $*"; }
warn() { echo "WARN $*"; }
bad() { echo "FAIL $*"; }

echo "=== FamilyFlow environment verification ==="
echo "Host: $(uname -s) $(uname -m)"
echo "macOS: $(sw_vers -productVersion 2>/dev/null || echo n/a)"

if command -v node >/dev/null; then
  NODE_V=$(node -v)
  ok "Node $NODE_V"
  case "$NODE_V" in
    v22.*|v23.*) ;;
    *) warn "Node 22+ recommended (found $NODE_V)" ;;
  esac
else
  bad "Node.js missing"
fi

PNPM="$ROOT/.tools/pnpm-bin"
if [[ -x "$PNPM" ]]; then
  ok "pnpm $($PNPM -v) (workspace binary)"
elif command -v pnpm >/dev/null; then
  ok "pnpm $(pnpm -v)"
else
  bad "pnpm missing — use .tools/pnpm-bin after install script"
fi

if command -v docker >/dev/null; then
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
else
  warn "Docker missing (needed for DynamoDB Local)"
fi

if command -v aws >/dev/null; then
  ok "AWS CLI present"
  if aws sts get-caller-identity >/dev/null 2>&1; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo unknown)
    ok "AWS authenticated (account $ACCOUNT) — credentials not printed"
  else
    warn "AWS CLI present but not authenticated"
  fi
else
  warn "AWS CLI missing — cloud deploy blocked"
fi

if command -v vega >/dev/null || [[ -x "$HOME/vega/bin/vega" ]]; then
  ok "Vega CLI found"
else
  warn "Vega SDK/CLI not found — Fire TV VVD path blocked (Apple Silicon supported per Amazon docs)"
fi

if command -v ask >/dev/null; then
  ok "ASK CLI found"
else
  warn "ASK CLI not found — use local Alexa simulator or install ASK CLI"
fi

DF=$(df -g ~ 2>/dev/null | awk 'NR==2{print $4}')
if [[ -n "${DF:-}" ]]; then
  ok "Free disk (Gi) ~$DF (Vega docs recommend ≥20GB free for VDT)"
fi

echo "=== Done ==="
echo "See docs/IMPLEMENTATION_STATUS.md and docs/KNOWN_LIMITATIONS.md"
