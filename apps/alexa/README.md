# FamilyFlow Alexa skill

Custom skill (ASK SDK) for FamilyFlow adventure requests.

## Intents

- `LaunchFamilyFlow`
- `SuggestAdventure`
- `RequestAdventure`
- `CheckMissionStatus`
- `FamilyHelp`

## Identity (critical)

Voice never authenticates by spoken child name. Sensitive actions require:

1. Linked household identity (Cognito account linking in production), and
2. Parent confirmation in the FamilyFlow dashboard for activation/completion rewards.

## Simulator notes

| Path | Status |
|------|--------|
| Alexa Developer Console simulator + Cognito account linking | Preferred production-like path; requires Amazon Developer account + published/dev skill + linking config. **Not configured in this sandbox.** |
| Local intent simulator `simulate:local` | **Real alternative test route** hitting the FamilyFlow API with `FAMILYFLOW_ALEXA_TOKEN`. Not production-ready. |

```bash
# API must be running
FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 pnpm --filter @familyflow/alexa simulate:local SuggestAdventure
FAMILYFLOW_ALEXA_TOKEN=local:local-parent-001 pnpm --filter @familyflow/alexa simulate:local RequestAdventure
```

## Privacy

Skill responses and backend audits cover **FamilyFlow activity only**. No claim of access to unrelated Alexa conversations.
