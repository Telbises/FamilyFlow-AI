# FamilyFlow Fire TV / Vega

## Status (honest)

| Surface | Status |
|---------|--------|
| 10-foot **browser TV shell** (`pnpm --filter @familyflow/fire-tv dev`) | Implemented for API + D-pad UX integration testing |
| Official **Vega SDK + Vega Virtual Device** package | **Not built in this workspace yet** — Vega CLI/SDK were not installed on the M0 host |
| Physical Fire TV | Not available on the development machine |

Hackathon rules allow demo video on a **Fire TV/Vega simulator**. After installing [Vega Developer Tools](https://developer.amazon.com/docs/vega/0.22/install-vega-sdk.html), scaffold a React Native for Vega app (see Amazon `react-native-multi-tv-helloworld` / `vega-tv-interfaces-sample`) and point it at the same API.

**Do not claim this browser shell is Vega-certified.** It exercises the same FamilyFlow backend pairing and mission flows with a remote-friendly UI.

## Install Vega (owner action)

```bash
# macOS Apple Silicon prerequisites (official docs)
[[ $(arch) == "arm64" ]] && softwareupdate --install-rosetta --agree-to-license
brew update && brew install binutils coreutils gawk findutils grep jq lz4 gnu-sed watchman

curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash && source ~/vega/env
vega --version
vega virtual-device start --display-res=1920,1080
```

## Local TV shell

```bash
pnpm --filter @familyflow/fire-tv dev
# open http://127.0.0.1:3200
```

Views: Family Mission Board → Adventure Details / Request → Celebration & Rewards. Keyboard: arrow keys + Enter (D-pad stand-in).
