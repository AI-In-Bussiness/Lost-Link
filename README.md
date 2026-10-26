# LostLink

### Smart lost-and-found matching

LostLink helps people find belongings they have misplaced at **schools, sports facilities, and offices**. People describe a missing item, LostLink surfaces possible matches from listed found items, and staff manage claim requests.

## How it works

| Step | What happens |
| --- | --- |
| **1. Describe** | A student, visitor, athlete, or employee searches by describing the missing item, such as its type, color, brand, or distinguishing details. Search uses text and filters; staff attach photographs to found items. |
| **2. Match** | LostLink compares the description with items listed in the organization's lost-and-found and shows possible matches. |
| **3. Claim** | The person submits a request for an item they believe belongs to them. |
| **4. Review** | Staff review and manage requests, then coordinate returning items to their owners. |

## Who it's for

- **Schools** — help students and staff find belongings left around campus.
- **Sports facilities** — help athletes, spectators, and visitors find items left at games, practices, and events.
- **Offices** — help employees and visitors reconnect with items misplaced in shared spaces.

## Why LostLink

Lost-and-found searches can take time for both the person looking and the staff responsible for collected items. LostLink brings item descriptions and claim requests into one searchable workflow, making it easier to find possible matches and manage returns.

## Development and Founder B handoff

Lost-and-found for a competition demo. Despite the website being used as a demo, it needs to be fully operational and full-featured for the judges to test. The application combines Founder B's Next.js, TypeScript and Supabase foundation with Founder A's real API interface for search, inventory, private claims, review and return. Founder B's Phase 3 backend adds sanitized photo processing, review/publication/delivery APIs and staff activity. The live interface includes real photo upload, private review/publication, found-date filters, claimant-visible rejection explanations and item activity; semantic AI remains later work. See the [Phase 2 API handoff](docs/phase-2/README.md), [interface handoff](docs/phase-3/founder-a-handoff.md), and [photo/backend handoff](docs/phase-3/README.md).

## Phase 4 matching

Founder B’s [semantic matching checkpoint](docs/phase-4/README.md) runs a free local MiniLM model on the app CPU, with hybrid ranking and keyword fallback. No inference API or key is needed. The production build installs pinned model files; runtime inference is offline. The synthetic evaluation found 8/8 positives versus 5/8 for keywords, with no results on four negative/trap cases; broader quality and independent acceptance remain open.

## Local development

Use Node 24 (`.nvmrc`), npm 11 and Docker. Run from this repository root:

```sh
npm ci
npm run db:start
npx supabase migration up --local
npm run env:local
npm run env:photos
npm run db:test
npm run dev
```

`db:start` runs PostgreSQL 15, Auth, REST, Storage, the API gateway and local mail. Optional Studio, Realtime, edge functions and image transformations are excluded to fit development machines. It still downloads substantial Docker images on first use. Database migrations and two fictional organizations/items seed automatically on first start. `env:local` creates ignored `.env.local` with public local configuration and refuses to overwrite an existing file. Use `.env.example` to configure manually. App startup without Supabase configuration shows an unavailable sign-in state.

Do not create another Git worktree for ordinary cloud tasks: use this task's existing isolated checkout. Processes need restarting after restoring an environment snapshot.

### Windows setup

Docker Desktop must be running with Linux containers enabled. The local helpers
launch the pinned Supabase native executable directly, including from paths with
spaces; no manual shell or path edits are needed.

If npm reports that the Supabase install script was blocked, run:

```cmd
npm install-scripts approve supabase
npm rebuild supabase
npx supabase --version
```

Then follow the local development commands above. Stop at the first failing
command. If `.env.local` already exists, preserve it and skip `env:local`;
`env:photos` preserves existing processor credentials.

For demo-account provisioning in Windows Command Prompt, set your own unique
12+ character password locally (replace the placeholder), provision, then clear
the terminal variable:

```cmd
set "LOSTLINK_DEMO_PASSWORD=REPLACE_WITH_YOUR_OWN_12_PLUS_CHARACTER_PASSWORD"
npm run demo:accounts
set "LOSTLINK_DEMO_PASSWORD="
npm run dev
```

Open http://localhost:3000 and sign in with a synthetic account below and your
chosen password. Existing demo-account passwords are preserved on repeated runs.

### Demo accounts

Choose a unique 12+ character `LOSTLINK_DEMO_PASSWORD` through your terminal or secure environment settings, then run:

```sh
npm run demo:accounts
```

This operator script uses local CLI credentials for the local stack; for a hosted demo, supply `SUPABASE_SERVICE_ROLE_KEY` securely. It creates confirmed synthetic users and profiles, then assigns memberships after the synthetic seed is installed. Repeated runs preserve existing passwords and memberships. Never expose this script or the service-role key through an app route.

| Synthetic account | Access |
| --- | --- |
| staff.maple@example.test | Maple School staff |
| staff.cedar@example.test | Cedar School staff |
| admin.maple@example.test | Maple School admin |
| claimant@example.test | Claimant, no staff role |

This cloud instance has a generated local demo password in ignored `.env.demo.local` (owner-readable only). To reuse it for provisioning locally, run `node --env-file=.env.demo.local scripts/provision-demo.mjs`. Do not copy its value into Git or chat.

There are no committed passwords and no public signup. Use the sign-in page and account page to verify access. An organization admin cannot yet manage memberships in the application; provisioning remains an operator action in this phase.

### Validation

```sh
npm run lint
npm run typecheck
npm test
npm run db:test
npm run build
npm run test:live
```

`test:live` starts and stops its own production app on port 3000, using the running local Supabase stack. Free that port first. It creates and removes temporary confirmed Auth users, exercises real REST tenant isolation, and checks session-cookie sign-in/out, protected account access, CSRF rejection and redirect restrictions. It also tests real photo uploads, private preview/publication, Storage integrity, concurrent photo caps and a photographed-item claim/return. Port3001 must also be free for the missing-processor credential regression. It is an HTTP integration test, not a browser test. The SQL suites also cover owner-proof projection, Storage policies, role escalation denial, revocation, relational constraints and transactional lifecycle rules. The backend HTTP suite exercises staff inventory, private claims, concurrent approval, return, pagination, state conflicts and claim throttling. The separate `test:browser` suite runs the persisted product journey in Chromium against real local Auth/Postgres/Storage.

GitHub Actions runs the same checks against disposable local services. A workflow file does not establish that remote CI has run.

`npm run db:stop` stops local services while retaining local data. `npm run db:reset` destroys local data and reapplies migrations/seed; use only when explicitly intending to reset this local demo. Demo accounts must then be provisioned again. Never reset a shared or hosted database.

### Browser verification

Install the pinned browser tools, then run the production browser suite:

```sh
npm ci --prefix tools/phase2
python -m pip install -r tools/phase2/requirements.txt
python -m playwright install --with-deps chromium
npm run build
npm run test:browser
```

`test:browser` owns port 3000, creates isolated fictional organizations and accounts, and removes its fixtures afterwards. It checks twelve live routes at 320/768/1440px, axe accessibility rules, real photo review, private claims, approval/return across refreshes and other-user/other-school denial. It does not intercept API responses. Screenshots are written to `/tmp/lostlink-live-*.png`. These are automated builder checks; independent acceptance and a manual screen-reader audit remain separate.

See the [Overseer response](docs/coordination/overseer-response.md) and [implemented contract](docs/coordination/implemented-contract.md) for current behavior, the original findings and outstanding owner decisions.

## Hosted setup

See [Phase 1 handoff](docs/phase-1/README.md) for hosted prerequisites, configuration and readiness evidence. No Supabase or Vercel project is created by cloning this repository.

Architecture and security decisions: [Phase 0 handoff](docs/phase-0/README.md). License: [Apache 2.0](LICENSE).

### Phase 3 interface checks

The homepage, `/o/:slug/search`, item/claim screens, `/my/claims` and staff workspace now use the real cookie-authenticated API. `LOSTLINK_ORGANIZATION_SLUGS` optionally sets the school selector’s comma-separated public slugs (defaults to the two fictional seed schools). Direct organization URLs are also resolved by the API. Sign in with an operator-provisioned account; the real application has no demo persona controls.

For repeatable browser checks, start `npm start` and, separately, `node tools/phase2-preview.mjs`, then run `python tools/phase3-browser-test.py` with Python Playwright and Chromium installed. This suite checks production routes and exercises authenticated interactions in an isolated HTTP-fixture harness. It does **not** prove Supabase persistence. See the Phase 3 handoffs for their original verification boundaries and the [current integration snapshot](docs/coordination/current-state.md) for remaining photo/activity UI work.

## Working in this repository

Start with [AGENTS.md](AGENTS.md), then the [shared agent hub](docs/coordination/README.md).
The [documentation index](docs/README.md) organizes existing plans and handoffs;
the [repository map](docs/coordination/repository-map.md) explains file locations.

All agents use `main` as the common integrated baseline and deliver changes
through pull requests targeting `main`. Do not create new branches; reuse a
suitable existing PR source branch, following the workflow in AGENTS.md.
Read the [delivery snapshot](docs/coordination/current-state.md) and
track file ownership in the [coordination board](docs/coordination/task-board.csv).
