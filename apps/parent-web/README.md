# @familyflow/parent-web

The FamilyFlow parent dashboard — **Less scrolling. More living together.**

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · `next/font` (Fraunces + Source Sans 3).

## Run it

```bash
# from the repo root
pnpm install
pnpm dev:api                                  # terminal 1 — API on http://127.0.0.1:3100
pnpm --filter @familyflow/parent-web dev      # terminal 2 — dashboard on http://localhost:3000
```

Open the dashboard at **http://localhost:3000** (port 3000, hostname `localhost`). The API's default `CORS_ORIGINS` is only `http://localhost:3000`; if you browse via `127.0.0.1:3000`, copy the root `.env.example` to `.env` (it lists both origins) or set `CORS_ORIGINS` for the API.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://127.0.0.1:3100` | FamilyFlow API base URL |
| `NEXT_PUBLIC_LOCAL_PARENT_TOKEN` | `local:local-parent-001` | **LOCAL DEMO ONLY** bearer token |

Copy `.env.example` to `.env.local` to override.

## ⚠️ LOCAL ONLY authentication

Every request sends `Authorization: Bearer local:local-parent-001`. The local API accepts this only when it runs with `ALLOW_LOCAL_DEV_AUTH=true`.

- It is a development bypass, **not authentication** — there is no password and anyone who can reach the API can use it.
- Because it is a `NEXT_PUBLIC_*` value it is visible in the browser bundle. Never put a real credential there.
- Do not deploy this build to a shared host. Replace it with Cognito sign-in (Hosted UI + PKCE) and turn the bypass off first.

The dashboard shows a persistent "Local demo only" banner so this is never invisible.

## Views

| Route | View |
| --- | --- |
| `/` | Overview — FamilyFlow hero, today's numbers, setup checklist, latest moments |
| `/approvals` | Pending approvals — adventure requests and completion checks (awards points) |
| `/planner` | Weekly adventure planner — library, generate a new adventure, plan by day |
| `/children` | Child profiles & permissions — add child with visibility notice, Fire TV pairing code |
| `/rewards` | Rewards — points, reward trail, unlocked rewards |
| `/activity` | Activity history — audit events with actor filter |
| `/settings` | Settings & data controls — feature toggles, retention, export, delete |

## API calls (`lib/api.ts`)

| Action | Request |
| --- | --- |
| Create household | `POST /households` |
| Get current | `GET /households/current` |
| Add child | `POST /members` (`role: "child"`, `visibilityNoticeAcknowledged: true`) |
| Pairing code | `POST /devices/pairing-code` |
| List approvals | `GET /approvals` |
| Decide approval | `POST /approvals/:id/decision` |
| Completions | `POST /completions/:id/decision` |
| List / generate missions | `GET /missions`, `POST /missions/generate` |
| Rewards | `GET /rewards` |
| Audit | `GET /audit-events` |
| Settings | `GET /settings`, `PATCH /settings` |
| Export / delete | `POST /data/export`, `POST /data/delete-request` |

Decisions send a fresh idempotency key, so a double-click or retry never double-approves or double-awards points.

## Privacy copy & child notice

- Parents only see activity **inside FamilyFlow**. The UI says so on the overview, activity history and settings pages, and never implies access to unrelated Alexa, Amazon, or device telemetry.
- Adding a child requires showing an age-appropriate notice and an explicit parent acknowledgement; the API rejects the request otherwise.
- Privacy wording describes product behavior; it is not a legal or compliance certification.

## Design notes

Warm "living room / family adventure" direction: forest-green sidebar and hero, lantern-amber accents, mossy gradient background with light grain. All interactive targets are at least 44px, focus rings are always visible, status messages use `aria-live`, switches use `role="switch"`, and animation respects `prefers-reduced-motion`.

## Known limits

- Weekly planner day assignments are stored in the browser (`localStorage`); the API has no scheduling concept yet. Mission statuses shown in the plan are live from the API.
- Child permissions are household-wide today; the permission table is informational.
- Tailwind v4 is configured in CSS (`app/globals.css`, `@theme`) — there is no `tailwind.config.js`.
