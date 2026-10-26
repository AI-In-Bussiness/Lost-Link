# Founder B Phase 6 — reproducible demo

Founder B owns repeatable demo data, stable accounts, matching evidence and operational reliability (plan.pdf Phase 6 / LL-046–LL-051). Founder A owns presentation/pitch; Overseer owns skeptical judging. This package prepares the existing fictional demo without resetting a database or creating real-user data.

## Reproducible setup

Use Node 24, npm 11 and Docker. Start from the reviewed code commit and preserve its SHA in the rehearsal notes:

```sh
npm ci
npm run db:start
npx supabase migration up --local
npm run env:local
npm run env:photos
npm run model:download
```

`env:local` refuses overwrites; skip it when configuration exists. Never run db:reset on a shared demo. Seed is idempotent (fixed organization/item IDs, ON CONFLICT DO NOTHING); replaying it preserves item lifecycle and private details. Two public showcase items are Black athletic backpack at Maple and Blue water bottle at Cedar. Keep these available for discovery/matching; create a fresh photographed item for each claim/return rehearsal so successive runs do not consume the showcase inventory.

Securely supply the existing `LOSTLINK_DEMO_PASSWORD` (12+ characters); do not put its value in Git, chat, slides or logs. Provision the four existing synthetic identities:

```sh
npm run demo:accounts
npm run demo:check
npm run build
npm run start
npm run demo:check -- --app
```

| Account | Expected role |
| --- | --- |
| staff.maple@example.test | Maple staff only |
| staff.cedar@example.test | Cedar staff only |
| admin.maple@example.test | Maple admin only |
| claimant@example.test | Claimant, no memberships |

Provisioning preserves existing passwords/memberships. A new supplied password does not reset an existing account. Preflight signs in with the configured password, checks exact memberships, denies foreign-school staff inventory, checks own-claim receipt access, verifies published schools and seed visibility, and checks private fields stay out of public item DTOs. It fails visibly for mismatches rather than silently repairing access. It performs Auth sign-in/out and reads, with no application-data changes; --app also checks homepage, sign-in and organization API. No privileged key is needed for preflight. Provisioning alone requires the server operator credential.

`npm run test:demo` is a disposable-local-only integration check. It replays the non-destructive seed, provisions twice (second time with a different random password), and confirms original-password sign-in, unchanged account IDs and exact access after replay. Generated passwords remain only in subprocess memory. Existing local accounts require their original password; the test never rotates it. CI runs this against its fresh local stack; do not use it as a hosted provisioning command.

## Matching evidence

```sh
npm run eval:search
npx tsx tools/phase4/evaluate.ts model > /tmp/lostlink-additional-relevance.json
npx tsx tools/phase4/evaluate.ts fallback > /tmp/lostlink-fallback.json
```

The actual local MiniLM calibration has 8/8 positive top-three hits versus 5/8 keyword hits, no results on its four negative/trap cases. It uses ten fictional items and calibrated thresholds; this is a capability example, not general accuracy. The separate frozen 28-case/18-item set has 16/16 positive hits, but five negative/trap false positives and a failed proposed quality gate. Preserve its nonzero exit and JSON. Do not present diagnostic CI success as quality acceptance or hide these failures. Search offers possible matches; staff decide ownership from private claims. Fallback is verified separately and never fabricated as successful AI.

Run the commands on the rehearsal machine and retain commit SHA, model manifest revision, full JSON reports and screenshot evidence. The model runs offline after asset setup. `LOSTLINK_SEMANTIC_SEARCH=false` switches to keyword-only search if native inference is unavailable; explain the actual active mode to judges.

## Rehearsal and recovery

1. Run preflight immediately before the demo. Use separate staff/claimant browser profiles. Keep password entry out of a shared screen.
2. Show public discovery at Maple; show the same query cannot expose Cedar items. Describe matching reasons without claiming proof of ownership.
3. Maple staff creates a fresh fictional item, uploads a benign photograph, privately previews it and explicitly publishes it after review. Use no names, ID cards or ownership secrets in photos.
4. Claimant submits fictional private proof. Staff reviews, approves, and confirms physical return. Refresh the claim/status page to show persistence. Reserved/returned items disappear from public discovery. Use a new intake item on the next run.
5. If sign-in fails, confirm the original demo password; provisioning does not rotate it. If roles are wrong, have the operator inspect the intended project and membership; do not broaden access to get through a demo.
6. If preflight reports a consumed showcase item, use a fresh staff intake for the live story. Restore any fixed showcase only through a reviewed operator action; never silently reset a shared database.
7. If photo processing is unavailable, check the secure processor binding and existing private pending list before retrying; a lost response may have committed a photo. Do not bypass publication review. If matching fails, demonstrate truthful keyword fallback.
8. For an application regression, stop writes and return to the last verified code/model/configuration combination. Database migrations are forward-only; do not roll back or erase shared data ad hoc. Production rollout/rollback verification belongs to Phase 7.

## Verification and boundaries

Foundation CI exercises seed/account repeatability, SQL tenant/privacy/Storage policies, actual model inference/evaluation, live Auth/backend/photo APIs, concurrent approval/photo caps, and a persisted photographed-item-to-return browser journey. Those tests use synthetic disposable fixtures and clean up their own records. `test:live` and `test:browser` own port 3000; stop the rehearsal server before running them. See the Phase 6 report and PR for exact run evidence.

This branch starts from main f18076d. Phase 5 PR14 is separately pending integration; verify the final combined release after it merges. This is not authorization to merge or deploy. No hosted account, credential, migration or production data was changed by this task.
