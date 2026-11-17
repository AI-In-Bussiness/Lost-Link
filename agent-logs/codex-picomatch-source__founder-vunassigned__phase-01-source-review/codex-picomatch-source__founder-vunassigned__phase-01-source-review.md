# Phase Report: 01 — Picomatch source review

## Metadata
- **Agent:** codex-picomatch-source (Codex research collaborator)
- **Founder version:** unassigned
- **Phase:** 01 — Source review
- **Status:** Completed
- **Date (UTC):** 2026-11-17
- **Task / issue:** PR #55 security-check remediation; GHSA-fc5q-39xc-vjpf / CVE-2026-112366.
- **Branch / commit:** codex/paper-motion, based on 96db0a4; no implementation edits or commits.

## Objective and scope
- **Goal:** Determine whether an official fix or verifiable fork genuinely remedies single-branch repeated-extglob ReDoS.
- **In scope:** Official source and PR review; scoped fork source, provenance, and regression inspection.
- **Out of scope:** Editing application manifests, lockfiles, workflows, or audit policy; adopting a dependency; integration validation.

## Work performed
- Inspected official master HEAD `9fab7bf61913ea334c4203ed321c426cfde44a42`, whose package version remains 4.0.7 and whose repeated-extglob analyzer skips the vulnerable single-branch cases.
- Read upstream PR #194, cited by the advisory. It is open and explicitly states that `+(*a)` remains exponential. It is not an adequate remediation.
- Inspected `@ryotsu/picomatch@4.0.7-a`, commit `3ab5a7627d480259e3d9ca67fbc14c125d374f0e`, whose parent is the exact official master HEAD above.
- Reviewed the fork's only runtime source change: 81 added lines in `lib/parse.js`, introducing a star-containing branch analyzer and collapsing redundant repeated quantifiers for proven-safe shapes; complex unsupported forms are literalized.
- Read registry metadata and decoded the registry-served SLSA attestation, which ties release tag `4.0.7-a` and package digest to the exact fork commit and GitHub Actions trusted publishing workflow.
- **Files created or modified:** This report only; all clones and diagnostic artifacts are under `/tmp`.
- **Decisions made:** The fork contains a genuine code remediation, not merely renamed metadata. Adoption requires exact version/integrity pinning and downstream compatibility checks. Provenance establishes artifact origin; it does not establish upstream endorsement or long-term maintainer trust.

## Validation and results
- **Commands / checks run:** `git ls-remote` and shallow clones verified source heads. `npm view @ryotsu/picomatch@4.0.7-a --json` confirmed version, integrity, trusted publisher, and gitHead. Registry provenance payload identifies the same commit. Ran `test/options.maxExtglobRecursion.js` through a minimal synchronous describe/it harness: all 17 existing-plus-fork tests passed, including bounded attack subprocesses and semantic comparisons. Direct bounded subprocess comparison of `+(*a)` against `a.repeat(34) + '!'`: official master timed out at 1500ms; fork returned false in 5ms.
- **Tests not run:** Full upstream suite, micromatch 2.x-to-4.x compatibility, ESLint integration, and application suites are delegated to parent integration. Default command sandbox blocked subprocess spawning with EPERM; the unchanged check passed with additional network permission.
- **Deliverables:** Source/provenance findings and the required report. Package integrity observed: `sha512-JroBFEmaejC7szGSfqOhF1QZHLKvX2wTA1+fWyfkpy3BjzdQKNPLKa2FtgeKVUDy5/UPUNkXEeCHJ5ZRBMLTVA==`.

## Thoughts and reflections
- **What worked well:** Comparing a fork against its exact upstream parent made runtime changes easy to isolate. Source inspection plus a bounded vulnerable/fixed execution comparison distinguishes remediation from audit-name changes.
- **What was difficult or surprising:** Advisory references can point to related work that explicitly leaves the reported vulnerability unresolved; #194 must not be mistaken for the fix.
- **Trade-offs and alternatives considered:** Waiting for an official release avoids introducing a third-party maintainer but leaves the high finding unresolved. A tightly pinned inspected fork may be a viable temporary remediation after integration tests; a floating branch or unverified rename is unsuitable.
- **What I would improve next:** Replace the temporary fork with an official patched release once one exists, and preserve the bounded ReDoS regression check.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Parent should compare the published tarball with the inspected source, validate micromatch/tinyglobby consumers, and run ordinary lint/build/tests before adopting the alias.
- **Dependencies / assumptions:** Findings apply to exact fork 4.0.7-a / commit 3ab5a76 and official master 9fab7bf observed on this date. The fork is an independent third-party project.
- **Risks / integration concerns:** A version-4 implementation replacing picomatch 2.x can alter matching semantics; ordinary package presence alone is not adequate compatibility evidence. Registry attestations were decoded and matched to metadata here, not independently cryptographically verified.
- **Questions / requested decisions:** Founder version was not supplied and remains unassigned. Parent owns the adoption decision within the authorized security-check repair.

## Follow-up and handoff
- **Remaining work:** Parent tarball verification, narrow integration, and full checks.
- **Recommended next steps:** If adopting, pin exact scoped version and integrity, retain the security regression, document temporary upstream tracking, and keep the audit gate unchanged.
- **Relevant references:** https://github.com/micromatch/picomatch/pull/194 ; https://github.com/ryotsu-kankichi/secured-picomatch/commit/3ab5a7627d480259e3d9ca67fbc14c125d374f0e ; https://registry.npmjs.org/-/npm/v1/attestations/@ryotsu%2fpicomatch@4.0.7-a
