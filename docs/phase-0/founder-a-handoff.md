# Founder A — Phase 0 handoff and final thoughts

Prepared October 25, 2026. Scope: strategy and UX planning for LostLink. This work adds new documentation files only; the repository README is unchanged. No application, infrastructure, interviews or research results were created by this phase.

## Deliverables and task evidence

- [Product scope](product-scope.md): LL-002 audience, LL-003 proposed MVP baseline, 10 acceptance criteria, scope exclusions and demonstration sequence.
- [Competition and evidence](competition-and-evidence.md): LL-001 rules/submission analysis, all eight rubric categories, research plan, impact model and initial AI/spend ledger. References slide numbers from the supplied deck.
- [UX specification](ux-spec.md): provisional LL-004 journeys, 12 screens/routes, student and staff actions, accessibility targets and failure states.
- [Shared contract proposal](shared-contract-proposal.md): Founder A's LL-006 contribution and LL-005 inputs for Founder B, covering data visibility, operation semantics, state transitions, concurrency and proposed validation.
- [Task board](task-board.csv): LL-007 editable CSV with owners, dependencies, evidence, reviewers and blockers; importable into spreadsheet tools. Extra A0-R IDs are local follow-ups, not invented master-workbook tasks.

Use only these task statuses: Not Started, In Progress, Blocked, Review, Done. Completed drafts are in Review, not self-certified Done. The source plan requires a different reviewer to verify work. No independent approval has been obtained. The original master workbook was referenced but not uploaded, so this board does not claim to reproduce all 56 tasks or their unknown definitions.

## Phase 0 exit gate

| Gate | Current state | Who resolves it |
| --- | --- | --- |
| MVP checklist approved | Draft delivered; joint approval pending | Both founders + Overseer |
| Architecture contract complete | Product proposal delivered; backend/security decisions pending | Founder B + Overseer |
| Competition priorities agreed | Actual rubric mapped; team agreement pending | Both founders |
| External requirements captured | Slides reviewed; exact dates/destination and track details pending | Team / organizers |

Founder A deliverables are ready for review. The overall Phase 0 gate remains open. Planning targets and proposed fields are not claims that implementation or privacy enforcement already exists.

## Final recommendations

1. **Begin need research now.** The rubric assigns 10 points directly to need/demand and another 30 to understanding/value. Real school-office workflow evidence should shape the build. Fictional demo data establishes capability, not demand. Do not invent interviews, statistics, endorsements or measured savings.
2. **Keep one complete return workflow as the build target.** Staff intake, scoped search, private claim, approval and physical return should persist before adding extras. Preserve human ownership verification and keep private identifiers out of photos, embeddings and match explanations.
3. **Give AI a measurable job.** First implement keyword/attribute retrieval, then evaluate semantic matching with paraphrases and a documented fallback. Avoid ownership percentages and unsupported “AI accuracy” claims.
4. **Plan for the actual submission package.** Alongside the site, reserve effort for the 60-second demo, 3–5 minute pitch, one-page summary, research evidence and AI/spend disclosure. Students on the team must understand and explain the retained AI-assisted work.
5. **Resolve the shared contract before parallel frontend/backend implementation.** Founder B should confirm auth/provisioning, organization permissions, retention, uploads and atomic claim decisions. The Overseer then reviews pages, fields and behavior against the MVP checklist.

Next authorized development phase, once the joint baseline is settled: Founder A prepares realistic fictional inventory and mock API responses from the agreed contract (Phase 1). This handoff does not implement Phase 1 or deploy anything.

## Verification and limitations

The competition slides were extracted as text from the uploaded PPTX's 20 slide XML files. Rubric weights sum to 100. Recommendations about paid-track thresholds are explicitly distinguished from confirmed requirements. Local documentation checks verify relative Markdown links, CSV row shape/task IDs and absence of README changes; whitespace is checked with `git diff --check`. There is no runnable app yet, so browser/build/security tests are not applicable. No screenshots or PR were created for these planning documents; the committed files and Git diff are the review evidence.

Open inputs: actual deadline and competition-period dates, submission destination, organizer confirmation of paid-track recommendations, actual tool spend/entitlements, team names/contributions, original workbook if available, real research findings, Founder B's architecture/security decisions and independent review. None is silently assumed complete.
