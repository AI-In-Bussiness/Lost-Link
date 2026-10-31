# Phase Report: 02 — Owner upload review

## Metadata
- **Agent:** codex-issue-49-review (independent read-only subagent; parent records handoff)
- **Founder version:** unassigned
- **Phase:** 02 — Owner upload review
- **Status:** Completed
- **Date (UTC):** 2026-10-31
- **Task / issue:** Issue #49 owner JPEG upload follow-up
- **Branch / commit:** codex/issue-49-compress-images; repair based on 80624a7

## Objective and scope
- **Goal:** Verify membership-free owner uploads while preserving processor boundaries.
- **In scope:** Migration009/setup, actor identity, grants and SQL/browser regressions.
- **Out of scope:** Hosted SQL installation and unrelated administration.

## Work performed
- Reviewed HTTP authorization and service-role call chain; p_actor comes from auth.getUser().
- Compared new function bodies to originals: only create-or-replace syntax and two actor predicates changed.
- Verified setup definitions match migration009 and db:test registers owner-photos.sql.
- Reviewed both-owner JPEG browser/Storage assertions.
- **Files created or modified:** None by reviewer; parent records this report.
- **Decisions made:** No actionable findings.

## Validation and results
- **Commands / checks run:** Exact-body/setup comparisons; git diff --check; node --check scripts/test-database.mjs; Python compilation passed.
- SQL coverage includes two membership-free owners, public/hidden schools, null processor auth.uid, service-only ACLs, forged role/actor attempts, claimant/foreign denials, scope/creator mismatch, Storage integrity, owner revocation, private/public flow, caps and quota.
- Browser coverage includes small/oversized JPEG, both owners, private/public visibility, refresh, stored hash/length/creator and reservation counts.
- **Tests not run:** Reviewer did not execute SQL or persisted browser suites; SQL agent and CI own that evidence.
- **Deliverables:** Independent security review and setup parity verification.

## Thoughts and reflections
- **What worked well:** Database authorization aligns with existing HTTP owner access while RPC execution stays restricted.
- **What was difficult or surprising:** HTTP already recognized owners while trusted processor functions required membership.
- **Trade-offs and alternatives considered:** p_actor is necessary; an auth.uid helper inspects the processor identity.
- **What I would improve next:** Verify an owner upload after applying hosted SQL.

## Cross-agent and cross-phase comments
- **For agents on other phases:** Retain service-only grants; derive p_actor from verified sessions.
- **Dependencies / assumptions:** Administration schema provides platform_admins and processor service-role configuration.
- **Risks / integration concerns:** Source deployment does not install hosted database functions.
- **Questions / requested decisions:** Founder version remains unassigned.

## Follow-up and handoff
- **Remaining work:** Runtime SQL results, final-head CI and hosted repair delivery.
- **Recommended next steps:** Apply009 in intended project's SQL Editor; retry owner JPEG/private review.
- **Relevant references:** Migration009; owner-photos.sql; docs/administration.md.
