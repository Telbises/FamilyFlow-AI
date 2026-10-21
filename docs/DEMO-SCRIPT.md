# FamilyFlow demo script (~3 minutes)

**Promise:** Less scrolling. More living together.  
**Privacy line (say once):** Parents only see FamilyFlow activity — not other Alexa chats or Amazon account history.

## Setup before recording

1. API running (`pnpm --filter @familyflow/api start`)
2. Parent web at `http://localhost:3000`
3. TV shell at `http://127.0.0.1:3200` **or** Vega VVD if installed
4. Optional: Alexa local simulator prepared

## Flow

1. **Parent dashboard** — Create household. Show brand + overview.
2. **Add child** — Age band 7–12. Acknowledge visibility notice.
3. **Pairing** — Generate code; enter on TV; board loads.
4. **TV** — Open a mission; Request adventure.
5. **Dashboard** — Pending Approvals → Approve.
6. **TV** — Refresh / show approved status.
7. **TV** — Request completion.
8. **Dashboard** — Approve completion → points once → reward unlocked.
9. **Activity** — Show audit timeline including request + approval.
10. **Alexa** — Run `simulate:local RequestAdventure` (or Console) → same pending approval path.
11. **Settings** — Point at export/delete and privacy disclosure.

## Do not claim

- Access to unrelated Alexa conversations
- Fire TV third-party app telemetry
- COPPA certification
- That the browser TV shell is Vega OS itself (unless recording on VVD/device)
