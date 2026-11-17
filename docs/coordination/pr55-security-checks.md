# PR #55 dependency security repair

The original redesign head `96db0a4` passed Foundation (including persisted
Auth/database/Storage/browser checks), interface, relevance, platform-helper and
Vercel checks. Security run
[44135352594](https://github.com/AI-In-Bussiness/Lost-Link/actions/runs/44135352594)
failed its unchanged `npm audit --package-lock-only --audit-level=high` gate.

## Remediation

- Next.js and its ESLint configuration: **16.4.3 → 16.4.6**, resolving the
  reported root-parameter cache disclosure advisories.
- Refreshed the declared upstream TypeScript ESLint dependency to **8.73.0**.
  It now declares minimatch **^11.0.1**; the lock resolves **11.0.9**, addressing
  [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) without
  forcing an unsupported minimatch major beneath an older parser.
- Picomatch **2.3.2 and 4.0.7** are affected by
  [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf).
  On 2026-11-17, upstream lists no patched release. Both development-tooling
  dependency paths therefore use the exact npm alias
  **npm:@ryotsu/picomatch@4.0.7-a** through a root override.

## Temporary fork review

The picomatch alias is a third-party security fork, not an official release.
It changes actual matcher code: redundant star-containing repetitions are
collapsed and unsupported complex repeated forms are treated literally. This
removes the nested quantifier that causes the reported ReDoS.

Two independent agents and the integrator reviewed the shipped source. There
are no added runtime dependencies or install lifecycle hooks. The MIT license
is retained. Registry provenance ties the package to source commit
[3ab5a7627d480259e3d9ca67fbc14c125d374f0e](https://github.com/ryotsu-kankichi/secured-picomatch/commit/3ab5a7627d480259e3d9ca67fbc14c125d374f0e).
The lock pins the exact version, tarball URL and SHA-512 integrity; updates do
not float to a new release from this publisher.

A clean npm audit only establishes the scanner result for these package
identities. The fork has a different advisory identity, so the fix is also
validated behaviorally: four attack cases time out in the original matcher but
complete in milliseconds in the fork. The new repository regression exercises
both installed matcher paths in subprocesses with a five-second deadline.
Actual micromatch, fast-glob and tinyglobby file discovery tests verify common
source globs, braces, extglobs and exclusions. Lint rules/plugins are retained.

This replacement also changes the old v2 transitive consumer to v4. Independent
micromatch differential checks found no differences across 137 representative
matching/capture cases. A 156-case v4 comparison found only upstream documented
matching corrections. This is sampled compatibility evidence, not proof of
complete equivalence; advanced captures/complex extglobs may differ.

## Validation and follow-up

Local audit reports **zero vulnerabilities**. Lint, typecheck, **78 unit tests**,
21 release checks and optimized Next.js production compilation pass. Required
PR checks are rerun on the new commit. The audit threshold, full-history secret
scan, lint configuration and required checks are unchanged.

Replace the temporary alias with an official fixed picomatch release when
available, retaining the malicious-input and consumer regressions. No merge or
production publication is performed by this repair.
