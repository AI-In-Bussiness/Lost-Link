# Founder A / Founder B integration notes

Historical Phase 2 merge inventory. These implementation gaps are now reconciled in the [current contract](../coordination/implemented-contract.md); Phase 3 photos are populated after review. The original table is preserved to explain prior mismatches.

The Founder B branch includes current main through `412010c`, preserving Founder A's documents, standalone mock package, mock assets, competition materials and the repository agent rules. The generated Next.js rules are appended to AGENTS.md. Required retrospective per-agent/per-phase reports are included in agent-logs; they distinguish local completion from the blocked hosted gate.

The mock package is still an independent proposal and is not imported into production routes. This merge does not wire mock-backed screens to the real backend. Founder A/integrator must reconcile these differences explicitly:

| Founder A mock/proposal | Founder B implemented API |
| --- | --- |
| pending claim | submitted claim |
| ownershipEvidence, foundLocation, verificationNotes | evidenceText, publicLocation, identifyingDetails |
| contactEmail in claim input | Claimant identity from Auth; contact not copied into claims |
| single photo and accessory category | photos array currently empty; accessory category not implemented |
| page/pageSize pagination | limit and opaque cursor pagination |
| other pending claims stay pending on approval | Competing submitted claims rejected atomically on approval |
| duplicate submit returns existing receipt | Duplicate active submit returns409; quota can return429 |
| Cedar Grove mock organization | Maple/Cedar synthetic backend seed; IDs/slugs are different |

No contract was silently rewritten to mask these differences. See the Phase2 API handoff and Founder A's shared-contract proposal before UI integration. Future semantic matching, image processing, real-data policy and deployment remain explicit follow-ups.

Combined-tree toolchain fixes: allowImportingTsExtensions permits the mock package's existing native-Node .ts imports under the no-emit compiler configuration; the mock test's unreachable guard after assert.equal was removed; an unused type import was removed. These changes retain test assertions and runtime mock behavior. The existing14 mock tests are included in CI through npm run test:mocks.
