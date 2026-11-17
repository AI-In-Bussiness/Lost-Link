# Phase Report: 03 — Dependency advisory review

## Metadata
- **Agent:** codex-paper-motion (Codex collaborator)
- **Founder version:** unassigned
- **Phase:** 03 — Dependency advisory review
- **Status:** Completed
- **Date (UTC):** 2026-11-17
- **Task / issue:** PR #55 security audit failures; investigate honest dependency remediation.
- **Branch / commit:** codex/paper-motion, research started on 96db0a4.

## Objective and scope
- **Goal:** Identify genuine fixed dependencies for picomatch and minimatch without suppressing audit checks.
- **In scope:** Read-only dependency/advisory research, registry metadata, package/source comparison, bounded vulnerability reproduction, compatibility recommendations.
- **Out of scope:** Changes to manifests, lockfiles, workflows, or application code; parent owns remediation and integration checks.

## Work performed
- Reproduced `npm audit --json` and inspected the actual dependency tree: picomatch 2.3.2 under micromatch/fast-glob and 4.0.7 under tinyglobby; minimatch 10.2.6 under typescript-estree.
- Confirmed current upstream picomatch latest remains 4.0.7, affected range is `<=4.0.7`, and the official advisory explicitly lists no patched version. Ordinary version updates cannot fix this advisory today.
- Confirmed minimatch advisory affects `>=7.0.0 <11.0.1`; latest 11.0.9 is fixed. Upstream typescript-eslint/typescript-estree 8.73.0 depends on minimatch `^11.0.1`, so refreshing that upstream dependency is preferable to an unsupported minimatch 10-to-11 override.
- Downloaded registry tarballs for picomatch 4.0.7 and the explicit security fork `@ryotsu/picomatch@4.0.7-a`, unpacked under `/tmp`, and compared every shipped file. No new runtime dependencies or install lifecycle scripts appear. MIT license is preserved.
- Delegated independent official-source/provenance review. Official cited PR #194 is open and explicitly does not fix the single-branch repeated-extglob vulnerability. The security fork's source patch is commit `3ab5a7627d480259e3d9ca67fbc14c125d374f0e`, atop official source `9fab7bf61913ea334c4203ed321c426cfde44a42`.
- Verified the fork adds an actual branch-star analyzer and removes unsafe redundant repeated quantifiers, falling back to literal matching for unsupported complex forms. Differences from released 4.0.7 also include upstream POSIX bracket, newline globstar, and `**.js` correctness fixes.
- **Files created or modified:** This report only. Independent source agent created its own required report. All downloaded packages and diagnostic programs are in `/tmp`.
- **Decisions made:** Recommend fixed upstream typescript-eslint for minimatch. For picomatch, an exact pinned, source-reviewed npm alias to the fork is a defensible temporary remediation, subject to actual lint and downstream compatibility checks. A local reviewed vendor patch remains an alternative if the project declines a third-party publisher. Neither approach should merely rename vulnerable code.

## Validation and results
- **Commands / checks run:** `npm ls picomatch minimatch next --all`; `npm audit --json`; `npm view` version, dependency, engine, provenance, and integrity metadata; official advisory HTML inspection; registry tarball diffs; `/tmp/lostlink-dependency-review/check.cjs` via Node with bounded subprocesses.
- Four adversarial patterns (`+(*a)`, `+(*)`, `*(*)`, `+(*a).js`) on crafted 40-character strings each exceeded a 1.5-second subprocess deadline in upstream 4.0.7. The security fork returned the correct false result in approximately 1.6–1.9 milliseconds each and generated expressions without the redundant repeated quantifier.
- A 156-case sample across common source glob patterns and file paths found only two upstream documented corrections: `**.js` no longer crosses path separators, and `[!a].js` correctly excludes `a.js`.
- The independent source agent passed 17 relevant upstream/security tests and separately reproduced the upstream timeout versus a 5-millisecond fork result.
- **Tests not run:** No manifest/lock changes were made by this agent; parent must validate the actual alias installation with lint, build, tests, and a fresh audit. CommonJS API inspection supports compatibility but does not establish complete 2.x-to-4.x behavior equivalence.
- **Deliverables:** Research findings, exact candidate integrity, and independent source review report.

## Thoughts and reflections
- **What worked well:** Registry, advisory, tarball, and bounded behavioral evidence distinguish a real fix from a clean audit caused only by package naming.
- **What was difficult or surprising:** The advisory's reviewed range changed from `*` in the earlier CI output to `<=4.0.7`, but still includes every published upstream release. The advisory's referenced upstream PR is a correctness fix rather than a remedy for this vulnerability.
- **Trade-offs and alternatives considered:** The fork's provenance proves origin, not trustworthiness or upstream endorsement. Exact version and integrity pinning constrain future publisher changes. Vendoring offers direct control but introduces a permanent maintenance burden. Major-version replacement for existing picomatch 2.x consumers requires targeted compatibility validation.
- **What I would improve next:** Replace the temporary fork with an official fixed release once available and verify the advisory is resolved without weakening the security gate.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Parent owns package/lock remediation. Refreshing typescript-eslint 8.73.0 resolves minimatch through its declared upstream range. If adopting the fork, validate micromatch's function, return-state, internal `lib/utils`, `scan`, and `parse` uses as well as tinyglobby/fdir matching. Actual project lint is essential.
- **Dependencies / assumptions:** Project Node 24 satisfies minimatch 11.0.9's `20 || >=22` engine and the fork's `>=12` engine. These vulnerable package nodes were development tooling dependencies in the inspected tree.
- **Risks / integration concerns:** New independent third-party maintainer; source review and a pinned integrity are necessary. Security safeguards can be disabled with `maxExtglobRecursion:false`; no inspected caller opts out. Captures and unsupported complex wildcard extglobs can change, as explicitly documented by the fork.
- **Questions / requested decisions:** Founder version remains unassigned. Parent should choose the reviewed exact fork alias or local vendoring based on project maintenance preference, without audit suppressions.

## Follow-up and handoff
- **Remaining work:** Parent adoption, fresh install/audit, lint and relevant checks, PR #55 check rerun.
- **Recommended next steps:** If using the fork, pin `npm:@ryotsu/picomatch@4.0.7-a` with lockfile integrity `sha512-JroBFEmaejC7szGSfqOhF1QZHLKvX2wTA1+fWyfkpy3BjzdQKNPLKa2FtgeKVUDy5/UPUNkXEeCHJ5ZRBMLTVA==`; include a bounded regression for the actual vulnerability and downstream glob behavior.
- **Relevant references:** https://github.com/advisories/GHSA-fc5q-39xc-vjpf ; https://github.com/advisories/GHSA-g3hv-75wg-m249 ; https://github.com/ryotsu-kankichi/secured-picomatch/commit/3ab5a7627d480259e3d9ca67fbc14c125d374f0e ; `agent-logs/codex-picomatch-source__founder-vunassigned__phase-01-source-review/codex-picomatch-source__founder-vunassigned__phase-01-source-review.md`.
