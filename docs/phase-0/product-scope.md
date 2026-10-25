# LostLink: product scope

Status: Founder A working baseline, ready for independent review. Joint decisions remain proposed until Founder B and the Overseer agree. Source: user-supplied “LostLink — AI-Powered Website Development Master Plan.”

## Audience and promise — LL-002

Build the competition showcase for students and front-office lost-and-found staff at fictional **Cedar Grove School**. Use invented people, items and ownership evidence. Design organization boundaries for later schools, sports facilities and offices; demonstrate one school first. A second fictional organization is required only as a permission-test fixture.

A student can describe a missing belonging in ordinary language, find plausible items at their school, privately explain why one is theirs, and collect it after staff verification. Staff remain responsible for ownership decisions. AI similarity never proves ownership.

Student needs: quick mobile search, clear school context, useful matches, private evidence and an understandable claim status. Staff needs: fast item intake, a review queue, private comparison details and a reliable handover record. Judges need to see one complete, repeatable journey and honest evidence of AI value.

## Competition requirements — LL-001

The competition slides have now been reviewed: see [competition requirements and evidence plan](competition-and-evidence.md) for the 100-point rubric, mandatory submission package, permitted AI use and rules. Exact deadline/competition-period dates, submission destination, spend track and organizer adoption of recommended paid-track thresholds remain pending. The referenced 56-task workbook was not supplied; task IDs below use only labels present in the plan, except LL-004, whose UX assignment is explicitly provisional.

| Requirement to confirm | Evidence to capture | Owner |
| --- | --- | --- |
| Exact deadline/timezone and competition-period dates | Organizer confirmation and submission page | Both founders |
| Scoring categories and weights | Supplied slides, slide 8; mapped in competition-and-evidence.md | Both founders |
| Required artifacts and limits | Supplied slides, slide 3: website, 60s demo, 3–5 minute pitch, summary, disclosure, research | Founder A |
| Eligibility, AI/tool and data rules | Slides 4–9 reviewed; confirm spend track and eligibility dates | Both founders |

Following the rubric, prioritize a functioning search → claim → staff review → return workflow, clear AI utility, accessible mobile UX and organization privacy. Feature ordering is our internal strategy; competition requirements are mapped separately. The suggested 10-day plan is not a known deadline.

## MVP baseline — LL-003

| ID | Priority | User story and observable acceptance |
| --- | --- | --- |
| MVP-01 | P0 | Visitor understands the school lost-and-found purpose and reaches organization search from the homepage; active school is visible throughout the journey. |
| MVP-02 | P0 | Staff creates an item with title, public description, category, color, broad location, found date and one safe photo; a refresh retains it and it appears only in that school's available inventory. |
| MVP-03 | P0 | Student browses or describes an item and filters by category, color and found-date range; matching uses keywords/attributes, stays within the selected school and returns available items only. Empty query browses recent items. |
| MVP-04 | P0 | Student opens a listing with safe public details and submits a claim after sign-in. Required private evidence and a contact email are validated; success gives a persistent receipt and claim status. |
| MVP-05 | P0 | Staff sees only their school's inventory and claims, compares private evidence and approves or rejects a pending claim with a recorded decision. Rejection requires a claimant-visible reason. |
| MVP-06 | P0 | Approval reserves the item for one claimant; staff separately records physical handover. Item becomes returned, the approved claim becomes fulfilled, competing pending claims are rejected and search no longer shows the item. State survives refresh. |
| MVP-07 | P0 | A claimant sees only their own claims; staff authorization and organization scope are enforced on the server and database. Public listings expose no private evidence, contact data or verification notes. |
| MVP-08 | P0 | All critical pages have loading, empty, error and access-denied behavior, keyboard operability and usable phone/tablet/desktop layouts. The complete flow can be repeated with fresh fictional data. |
| MVP-09 | P1, target | Semantic matching recognizes a paraphrase such as “dark gym bag” for “black Nike duffel”; evaluate against keyword/attribute baseline on a fixed test set. Search continues with the baseline when AI is unavailable. |
| MVP-10 | P1, target | Result explanations use only public attributes; identify AI unavailability honestly and never display an invented ownership probability. |

P0 is the release floor. P1 matching and explanations are the competition showcase targets after P0 works. Defer email/push notifications, analytics beyond basic staff counts, image recognition, QR posters, multilingual search, generated descriptions, integrations, payments, chat, public lost-item posts, student item posting, self-service organization provisioning and evidence-file uploads. Claim evidence is text-only in the MVP; item photography remains required.

## Demonstration and acceptance evidence

1. Staff posts a fictional black Nike duffel found near the gym, with a private identifying detail withheld from the public photo and text.
2. Student searches “dark gym bag with a white logo near the basketball court” at Cedar Grove. The duffel ranks above unrelated items; a second school's item never appears.
3. Student submits a claim describing the hidden detail. Show that evidence only to the claimant and authorized school staff.
4. Staff reviews and approves; student sees collection instructions. Staff confirms physical collection and refreshes to show the returned state.
5. Search no longer offers that item. Repeat with AI unavailable to show the keyword/attribute fallback. Describe semantic improvement only after measured evaluation.

Proposed Phase 4 evaluation: 12 fixed queries (4 exact, 4 paraphrases, 2 no-match, 2 wrong-school traps) with labeled relevant items; target relevant item in top three for at least 7 of the 8 positive queries, zero cross-school results, and working fallback for all queries under provider failure. Founder B/Overseer must agree before using these as acceptance thresholds. Avoid a numerical cutoff implying ownership certainty; no-match UI allows browsing and staff contact.

## Scope change rule

Changes after joint agreement must name the user benefit, affected acceptance IDs, contract changes, owner and schedule cost. Add P2 features only after the Overseer verifies P0 and the agreed AI showcase. No founder may mark the joint Phase 0 gate approved on their own.
