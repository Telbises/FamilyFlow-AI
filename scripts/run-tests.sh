#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PNPM="${ROOT}/.tools/pnpm-bin"
if [[ ! -x "$PNPM" ]]; then
  if command -v pnpm >/dev/null; then PNPM=pnpm; else echo "pnpm not found"; exit 1; fi
fi

echo "Building shared + domain..."
"$PNPM" --filter @familyflow/shared build
"$PNPM" --filter @familyflow/domain build

FAIL=0
run() {
  echo ""
  echo ">>> $*"
  if ! "$@"; then
    echo "FAILED: $*"
    FAIL=1
  fi
}

run "$PNPM" --filter @familyflow/domain test
run "$PNPM" --filter @familyflow/api test
run "$PNPM" --filter @familyflow/fire-tv test
run "$PNPM" --filter @familyflow/alexa test
run "$PNPM" --filter @familyflow/alexa-plus-mcp test

if [[ "$FAIL" -ne 0 ]]; then
  echo ""
  echo "One or more suites failed. Do not mark milestone VERIFIED."
  exit 1
fi

echo ""
echo "All executed automated suites passed."
echo "Not executed (see docs/TEST_MATRIX.md): Playwright, Vega VVD, Alexa Developer Console."
