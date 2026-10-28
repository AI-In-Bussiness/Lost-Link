# Issue 35: security audit and presentation checklist

Audited on 2026-10-28 from main `846aacf`, including issue #34's landing page.
The security recommendations were supplied by the owner in chat after the
initial transcript omitted them. This is a source and local-test audit of the
demo; hosted provider settings and an independent penetration test are outside
the available evidence.

## Fixes and evidence

| Recommendation | Result and evidence |
| --- | --- |
| Check Git for secrets | Gitleaks 8.30.1 found no leaks in all 91 fetched commits or a snapshot of tracked/new source. Reports redact values. Ignored Next build-cache signing metadata is not source or a published API key. |
| Hide API keys / check environment variables | New shared configuration rejects secret/service-role keys in public settings, malformed URLs, URL credentials, and remote HTTP. Publishable and legacy `anon` keys remain supported. Privileged photo processing still uses server-only `SUPABASE_SERVICE_ROLE_KEY`. |
| Proper authentication / hash passwords | Password verification and storage remain with Supabase Auth. No custom password hashing or browser-owned authorization was introduced. Server checks use `getUser()`; the provider's hosted settings still need operator verification. |
| Session protection | Access/refresh and PKCE cookies now use HttpOnly and SameSite=Lax; HTTPS app origins also require Secure. The frontend uses same-origin endpoints and never needs token access. Unit assertions cover flags; persisted browser login now checks actual cookies and JavaScript exclusion in CI. |
| Add rate limiting | Existing database-backed limits allow five successful claims per user/hour and twenty photo reservations per staff user/hour, including aborted reservations. SQL suites exercise rejection. Auth email/login limits belong to the provider. Public-traffic edge limits remain a launch control to configure and verify, not a claimed feature of this patch. |
| User access / admin routes / secure database access | Reviewed role and school checks, RLS, revoked direct writes, security-definer search paths, safe public/claimant projections, and service-only photo grants. Foundation/backend/photo/Overseer SQL suites pass against isolated PostgreSQL using the test interfaces described below. |
| Secure API endpoints / sanitize forms | Existing strict schemas, duplicate-field rejection, safe redirects, same-origin mutation checks, bounded body reads, and photo re-encoding remain. Unit tests cover adversarial inputs and privacy projections. No ownership or staff authorization relies on the UI. |
| Protect against XSS / add security headers | New document CSP uses a fresh server nonce, forbids untrusted parser-inserted scripts and event handlers, restricts resources to local sources, forbids framing/plugins/base injection and off-site forms, and prevents document caching. Existing nosniff, referrer, frame and permissions headers remain. Chromium verifies real Next script nonces, blocked injected markup/event handlers/base tags, and normal page behavior. |
| Check CORS | No permissive CORS headers are added. Browser HTTP probes confirm cross-origin writes return 403 and neither those responses nor the preflight authorize the foreign origin. |
| Check for exposed files / debug mode | Production Chromium probes return 404 for `.env`, `.env.local`, `.git/config`, package/source/config and preview-tool paths. Production CSP omits eval; preview helpers refuse production execution. Next source maps remain disabled. Development-only debugging allowances are not in production policy. |
| Update dependencies / remove unused packages | Frozen root runtime and development dependency audits report zero known vulnerabilities. Runtime dependencies and development tooling have existing imports, framework or script/config uses; no package removal or unrelated version churn was needed. New scheduled/push/PR security checks audit the lockfile and scan full Git history. |
| Full security audit | Reviewed the boundaries above, with executed checks and limits recorded here and in the implementation report. A clean scanner result is not proof that every possible vulnerability is absent. |

The document policy uses inline **style attributes** for the existing React
layout, while script execution requires a nonce. Development alone allows eval
and development sockets. Root request-time rendering ensures nonce/HTML parity;
existing application pages were already dynamic. Static fonts, images, icon and
API routes keep their existing handling. Browser accessibility tooling executes
through the debugger rather than weakening the application policy.

## Visual recommendations

- The hero now states “School lost & found,” reusing the existing description
  rather than adding promotional claims. Its detailed feature/search workflow
  and local notebook design remain.
- The favicon reuses the existing arrow brand mark as a small local SVG. No
  image-generation model or external asset service is used.
- No purple gradients, pill buttons, emoji icons, em dashes, fabricated reviews,
  customer counters, invented performance/adoption metrics, cursor effects,
  scroll animations or AI-builder tags were found in the application source.
  Existing interface counts come from inventory or claim data. Functional
  loading indicators and reduced-motion support remain.
- Existing source-drawn SVG illustrations and licensed local fonts are retained.
  The owner explicitly authorized factual legal drafts for review. No generated
  photographs or new marketing prose were added. Historical AI assistance is
  not misrepresented as exclusively human authorship.

## Legal drafts requiring owner review

The owner requested **“Prepare factual drafts for my review.”** Consequently the
PR remains a draft; do not publish these pages or close #35 as implemented until
the owner approves their wording and the integration checks pass.

- [Privacy page source](../../src/app/privacy/page.tsx), rendered at `/privacy`.
- [Terms page source](../../src/app/terms/page.tsx), rendered at `/terms`.
- Policy navigation is present on the live footer, signup, sign-in,
  confirmation recovery, and account pages. The DOM router hands policy links
  to the real server routes. Both policies work without an account or database.
- The drafts describe current data flows and disclose the absence of an
  automatic record-deletion schedule. They do not invent a legal entity,
  jurisdiction, privacy contact, contractual guarantees, or regulatory approval.

Review the operator identity/contact, email delivery provider, school roles,
retention/deletion/backup arrangements and intended audience before real-data
use. Update the factual drafts if those operational details change.

## Domain and release prerequisites

The owner confirms that no custom domain has been acquired. Keep
`lost-link-beta.vercel.app` as the existing demo origin; this patch does not buy,
invent, redirect to, or claim verification of a domain. Once one is owned:

1. Attach it to the existing Vercel project, apply the exact DNS records supplied
   by Vercel, and verify HTTPS.
2. Set `NEXT_PUBLIC_SITE_URL` to that exact HTTPS origin. Update the Supabase
   Site URL and both allowed callback patterns using the
   [email redirect guide](auth-email-redirects.md).
3. Deploy and recheck confirmation, sign-in/out, CSRF, policy links and public
   inventory on the chosen domain.

Before a real-user launch, configure shared edge abuse controls for public
search/listing traffic and inspect hosted Auth limits, provider secrets,
retention/cleanup and backups. Existing claim/photo quotas and a one-worker
inference cap do not establish distributed protection for all public traffic.
Those operator controls require hosting/project access unavailable here.
Existing PR #33's matching/photo/release work is separately owned and preserved.

## Executed validation and limits

- Root lint/typecheck, 57 unit tests, UI typecheck/format and the existing
  release/mock test files pass.
- Both new real-Chromium production checks pass: CSP/injection/exposed-file/CORS
  boundaries and legal navigation/accessibility. Privacy and terms pass axe,
  five viewports, and doubled-text checks.
- A webpack production build passes. The default Turbopack build is blocked by
  this executor's subprocess port-binding restriction; no compiler setting was
  changed to hide the limitation.
- Four SQL suites pass on an isolated, network-disabled PostgreSQL 15 container
  with the repository's minimal bootstrap plus test-only `auth.role`, Storage
  metadata and service-role grants. These verify SQL rules, not real provider
  JWT verification or Storage HTTP behavior. No repository migration or hosted
  data changed. The full local Supabase image failed to extract under the Docker
  storage quota; full persisted Auth/HTTP/photo acceptance remains a CI check.
- GitHub checks on the published PR are the source for final-head CI status.
  The local model-download/inference path was not rerun; search/model code and
  model pins are unchanged.
