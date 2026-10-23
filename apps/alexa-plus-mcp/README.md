# FamilyFlow Alexa+ MCP (preview)

Streamable MCP server exposing **FamilyFlow-only** tools for agentic / Alexa+ preview flows.

## Tools

| Tool | Behavior |
|------|----------|
| `list_adventures` | Lists available missions for the linked household |
| `suggest_adventure` | Picks or generates (via API) a suggestion — parent still approves play |
| `request_adventure` | Creates a **pending** mission request (never auto-approves) |
| `check_mission_status` | Status of active FamilyFlow missions |
| `family_help` | Explains FamilyFlow privacy boundary |

## Auth

Set `FAMILYFLOW_API_BASE_URL` and `FAMILYFLOW_ACCESS_TOKEN` (Cognito access token or local `local:…` for dev). Spoken names are never used as credentials.

## Run

```bash
export FAMILYFLOW_API_BASE_URL=http://127.0.0.1:3100
export FAMILYFLOW_ACCESS_TOKEN=local:local-parent-001
pnpm --filter @familyflow/alexa-plus-mcp start
# default http://127.0.0.1:3300/mcp
```

## Amazon note

Wire this into Alexa+ / MCP partner flows only after following current Amazon Alexa+ developer documentation. Parent dashboard approval remains mandatory for activation and rewards.
