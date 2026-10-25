# LostLink

Lost-and-found for a fictional school competition demo. Founder B's Phase 1 foundation uses Next.js App Router, TypeScript, Tailwind and Supabase Auth/PostgreSQL/Storage. Founder B’s Phase 2 backend now supports structured search, inventory mutations and private claim review/return APIs. The interface and photo pipeline are not connected yet; semantic AI remains later work. See the [Phase 2 API handoff](docs/phase-2/README.md).

## Local development

Use Node 24 (`.nvmrc`), npm 11 and Docker. Run from this repository root:

```sh
npm ci
npm run db:start
npm run env:local
npm run db:test
npm run dev
```

`db:start` runs PostgreSQL 15, Auth, REST, Storage, the API gateway and local mail. Optional Studio, Realtime, edge functions and image transformations are excluded to fit development machines. It still downloads substantial Docker images on first use. Database migrations and two fictional organizations/items seed automatically on first start. `env:local` creates ignored `.env.local` with public local configuration and refuses to overwrite an existing file. Use `.env.example` to configure manually. App startup without Supabase configuration shows an unavailable sign-in state.

Do not create another Git worktree for ordinary cloud tasks: use this task's existing isolated checkout. Processes need restarting after restoring an environment snapshot.

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

`test:live` starts and stops its own production app on port 3000, using the running local Supabase stack. Free that port first. It creates and removes temporary confirmed Auth users, exercises real REST tenant isolation, and checks session-cookie sign-in/out, protected account access, CSRF rejection and redirect restrictions. It is an HTTP integration test, not a browser test. The SQL suites also cover owner-proof projection, Storage policies, role escalation denial, revocation, relational constraints and transactional lifecycle rules. The backend HTTP suite exercises staff inventory, private claims, concurrent approval, return, pagination, state conflicts and claim throttling. Future Playwright tests will cover the full implemented product journey.

GitHub Actions runs the same checks against disposable local services. A workflow file does not establish that remote CI has run.

`npm run db:stop` stops local services while retaining local data. `npm run db:reset` destroys local data and reapplies migrations/seed; use only when explicitly intending to reset this local demo. Demo accounts must then be provisioned again. Never reset a shared or hosted database.

## Hosted setup

See [Phase 1 handoff](docs/phase-1/README.md) for hosted prerequisites, configuration and readiness evidence. No Supabase or Vercel project is created by cloning this repository.

Architecture and security decisions: [Phase 0 handoff](docs/phase-0/README.md). License: [Apache 2.0](LICENSE).
