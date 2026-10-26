# LostLink — competition presentation draft

Founder A, Phase 6; 2026-10-26. Source: `plan.pdf` Phase 6 and `competition_rules.pptx` slides 3, 8, 16–19. Ready for review, not submission approval. Pair with [Founder B's operational runbook](README.md) and [evidence register](submission-evidence.csv). The task owner explicitly excluded the competition summary; none is delivered here.

## Brand and visual direction

**LostLink. Back in your hands.** A school lost-and-found that connects public discovery to private proof and a staff-recorded return.

Keep the existing [paper-and-pen direction](../../DESIGN.md): warm paper, dark ink, green actions, local licensed handwriting fonts and original belongings sketch. The voice is reassuring and concrete. Say “possible match,” “private claim” and “approved for collection.” Reserve “returned” for a physical handover recorded by staff. Avoid ownership percentages, recovery-rate claims and promises of automatic identification.

The homepage introduces the student's task before explaining the workflow. Its privacy note sets expectations before a claim. The staff dashboard prioritizes pending claims, then distinguishes available, reserved and returned inventory. The return checklist explains the next action and links directly to approved claims. Counts come from the signed-in school's records; they are not impact or adoption statistics.

## 60-second demo: one item, one return

Capture this on the real application and database after the runbook preflight passes. The standalone mock preview is for interface review and cannot supply persistence evidence. Use synthetic data and separate claimant/staff browser profiles; hide password entry. Introduce the recording as “an edited walkthrough using fictional school data.” Cuts can compress typing and profile changes, but every shown state must come from the same actual claim. Keep an uncut rehearsal as supporting evidence.

Before recording, staff creates a fresh fictional item titled **Green practice bag**, sets its color to green, uploads/reviews/publishes a benign photo, and records a fictional hidden detail in staff notes. Keep that detail out of the public description/photo. Do not consume the two fixed showcase items. Use the exact title query `green practice bag` after verifying it on the rehearsal machine. This query demonstrates the workflow; use separate evidence below when discussing semantic retrieval. Do not replace a failed search with a staged result.

| Time | Show | Say |
| --- | --- | --- |
| 0–8s | Homepage and school selector | “Your bag is missing. It may already be at the school office. LostLink helps you find what has been handed in.” |
| 8–20s | Maple search → fresh item detail | “Choose your school, describe the item, and inspect a possible match. Public listings show useful details, not the office's private identifying notes.” |
| 20–32s | Claimant submits fictional private proof | “Send a detail only the owner would know. Your claim stays between you and authorized staff.” |
| 32–45s | Staff reviews that claim and approves | “Staff compare the evidence. Approval reserves the item for collection. A search result never decides ownership.” |
| 45–54s | Confirm actual demonstration handover; refresh receipt | “After handing it back, staff record the return. Refreshing preserves the result.” |
| 54–60s | Returned receipt and brand | “LostLink. Public discovery, private proof, and a careful handover. Back in your hands.” |

About 125 spoken words; rehearse with the actual transitions and trim pauses to fit. Timing is a target, not a recorded result. In a live pitch, keep logins and the fresh intake prepared, show the same sequence without cuts, and allow a full minute. Never click return before the demonstration handover. If the live flow stalls, follow the runbook, name the failure and show the labeled recording; do not imply a recording is live.

## Four-minute pitch script

Use this spoken draft with the live app. The timeboxes follow slide 16; the final close fits inside four minutes. Rehearsal remains required. Square-bracketed team inputs must be resolved before submission. If research is still absent, keep the candid wording supplied here.

**0:00–0:30 — Hook and problem**

“Imagine finishing practice and realizing your bag is missing. Someone may already have handed it in, but you still need to discover where it is and prove it belongs to you. LostLink connects those steps: describe an item, find a possible match, send private proof, and collect it after staff review.”

**0:30–1:15 — User and insight**

“We designed this version for students looking for belongings and school-office staff managing found items. The school is the search boundary. Students see useful public details; staff keep identifying notes private.

“That is our workflow hypothesis, not a research finding. We have not yet established demand through real school interviews or a pilot. Before real use, we need to learn whether staff can maintain the inventory and whether students find this easier than asking at the office. [Insert a verified research finding and its source here only when collected.]”

**1:15–2:15 — Live demo**

“Here is a fictional school and a freshly listed bag. I search within this school and inspect the listing. As the claimant, I submit a private identifying detail. In the staff account, I compare it with the office notes and approve collection. Approval reserves the item; it does not mean the item has been returned. After our demonstration handover, I record the return and refresh the receipt. The recorded state persists.”

Leave time for the actions. Do not read account details or private proof aloud. If any step fails, say so and use the labeled fallback recording.

**2:15–3:00 — Differentiation, AI and value**

“Compared with asking at the office or browsing a generic list, our proposed advantage is one connected school workflow with private verification. We have not proven superiority over other products.

“Language matching runs with a local CPU model after setup, without a paid inference API. In a small calibrated synthetic set, it found eight of eight positive queries in the top three, versus five for keywords. A separate frozen set found all sixteen positives but also five false positives and failed its proposed quality gate. Those are test results, not an accuracy claim. Keyword fallback keeps discovery available; staff remain responsible for ownership.”

**3:00–3:50 — Proof and impact model**

“Our engineering evidence includes automated checks of private claims, school isolation, photo review and the persisted return workflow. Those checks establish tested behavior, not real-world adoption or independently approved security.

“Our impact hypothesis is fewer discovery steps for students and clearer review work for staff. We would measure completed search tasks, staff effort and verified returns against the current process before claiming an improvement. Sustainability requires a named school owner, approved hosting costs, access management and retention rules. These operating decisions and real demand evidence remain open. [Team names, individual contributions and tool costs must be supplied in the disclosure.]”

**3:50–4:00 — Close**

“LostLink helps students and school staff turn a found item into a careful return: public discovery, private proof, and a human decision. Back in your hands.”

## Judge Q&A — slide 17

| Question | Evidence-led answer |
| --- | --- |
| 1. Why is this problem important enough to solve? | Belongings can be handed in yet remain undiscovered. That is the problem hypothesis; its frequency and cost still need school evidence. |
| 2. Who is the exact user, and how do you know? | Students and school-office staff are the chosen design audience. Synthetic scenarios test their proposed tasks; interviews must validate that choice. |
| 3. What alternatives already exist? | Asking at the office, checking the physical lost-and-found, and digital inventory products. The real-product comparison in E-03 is still missing; do not assert we have no competitors. |
| 4. What evidence shows real need or demand? | None collected in this assignment. Technical tests do not establish demand. Bring dated, consent-appropriate research notes before making a demand claim. |
| 5. What creates the most value? | The complete discovery → private claim → staff review → physical return flow is the intended value. Measure it against the existing process. |
| 6. Where did AI help and where was it overridden? | Codex assisted code, tests, documentation and this pitch. Public-field-only local embeddings assist retrieval. Human review keeps private details out of retrieval and prevents search scores deciding ownership. Each member must supply an actual accepted/corrected output they can explain. |
| 7. What if AI/API is wrong or unavailable? | Show possible matches, never ownership guarantees. Keyword-only mode is available; explain the active mode. Photo or Auth outages need visible recovery and a labeled recording, not a bypass. |
| 8. How does it make money or remain sustainable? | This is an impact proposal. A school-office owner and approved operating budget are required. No willingness-to-pay, partnership, free-forever hosting or revenue claim is established. |
| 9. Biggest weakness? | Demand is unvalidated; the broader synthetic relevance gate fails; final combined/hosted release acceptance remains outstanding. These are also the three suggested areas for the Overseer's independent challenge. |
| 10. What next with a month? | Validate the workflow with staff/students, address false positives using new held-out cases, and establish school-approved operating/retention procedures before a real-user pilot. |
| 11. Personal contribution? | [Each actual member: name, changed files/commits, one decision, one correction and what they can explain.] Agent reports are not evidence of a student's personal contribution. |
| 12. Why win the prize? | Present the working connected flow and transparent technical tradeoffs. Let judges assess value against the rubric; do not substitute invented demand or impact for missing evidence. |

## Claims and release discipline

Keep both matching sets visible together. Do not describe the diagnostic workflow's green CI status as a passing quality gate. Inference is offline after model download; installation is not offline. “No paid inference API” does not mean the entire project cost $0. Accessibility checks are automated builder evidence; manual assistive-technology review is still separate.

Final team review must confirm competition eligibility dates, exact deadline/destination, paid-track interpretation, actual costs/credits, assets/outside help, contributions and research. The draft does not supply those approvals. Phase 7 owns final rehearsal, approved materials and hosted smoke verification.
