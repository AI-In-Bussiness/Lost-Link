# LostLink — AI-Powered Website Development Master Plan

Competition build strategy • Parallel AI agents • Quality checkpoints • Launch roadmap

Your goal should be to build more than an attractive website. You want a working, polished product that demonstrates a real problem being solved with AI, while making it easy for competition judges to understand its value.

The best approach is to divide LostLink into development phases, assign individual AI agents tightly defined responsibilities, and have separate agents independently review their work before it gets integrated.

## 1. What you're building

### LostLink's ideal end-to-end experience

#### 1. Search

A student describes their lost black Nike backpack.

#### 2. Match

AI finds relevant items even when descriptions use different words.

#### 3. Claim

The student submits a request with ownership evidence.

#### 4. Return

Staff verify the claim and mark the item returned.

For the competition, I recommend making these four steps work flawlessly before adding advanced features.

### Feature priorities

| Priority | Features |
| --- | --- |
| P0 — Essential | Homepage, organization-specific search, found-item listings, matching, claim submissions, staff dashboard, claim review |
| P1 — Strong competition enhancements | Semantic AI matching, match explanations, notifications, beautiful mobile design, analytics |
| P2 — Optional extras | AI image recognition, QR-code posters, multilingual search, automated item descriptions, integrations |

Important: A fully functional P0 product with several impressive P1 features will usually make a stronger demonstration than a huge website filled with unfinished functionality.

## 2. Your downloadable project command center

I created an editable spreadsheet with 56 individually assignable tasks, dependency tracking, agent roles, quality checks, completion formulas, and prompts you can copy directly into your AI agents.

LostLink AI Agent Build Tracker

Excel workbook · 9 organized worksheets · Editable progress dashboard

56 Build tasks

8 Phases

12 Agent roles

Download the LostLink Master Build Tracker

Includes Task Board, Dashboard, Milestones, Agent Roles, Copy-Paste Prompts, QA Scenarios, Demo Script, Start Here, and Sources. You can also import it into Google Sheets for collaboration.

## 3. Recommended technical architecture

I recommend this stack because it's capable of supporting the complete LostLink workflow without requiring you to assemble many unrelated services.

| Layer | Technology | Purpose |
| --- | --- | --- |
| Website | Next.js + TypeScript | Frontend and server-side application logic |
| Design | Tailwind CSS + shadcn/ui | Polished, reusable UI |
| Database | Supabase PostgreSQL | Organizations, found items, claims |
| Authentication | Supabase Auth | Claimants, staff and administrative roles |
| Images | Supabase Storage | Found-item photographs |
| AI matching | Text embeddings + pgvector | Semantic similarity |
| Hosting | Vercel | Website deployment |
| Testing | Playwright + CI | Automatic browser tests |

Next.js documents the App Router architecture, while Supabase supports row-level access control and keyword, semantic and hybrid search. Playwright can automate real user journeys through the finished site.

Source label in PDF: Next.js +3

### Suggested application architecture

Next.js LostLink website

Public search • Claim flow • Staff dashboard

Server-side application logic

Authentication • Organization permissions • Validation

Database

Items and claims

Matching

Rank candidates

Storage

Item photos

## 4. Step-by-step development roadmap

The schedule below is a suggested 10-day intensive sprint, not a fixed requirement. Adjust it based on the actual competition deadline.

### Phase 0 — Strategy and scope

Day 1

Tasks LL-001 through LL-007

- **Founder A:** Assign product and UX agents to define your primary audience, user stories, screens and competition requirements.
- **Founder B:** Assign architecture and security agents to define database entities, user roles, protected information and system contracts.
- **Overseer:** Verify both sides agree on scope, page names, data fields and expected behavior.

Exit gate: Approved MVP checklist, complete architecture contract and agreed competition priorities.

### Phase 1 — Foundation

Days 1–2

Tasks LL-008 through LL-014

- **Founder A:** Create mock API data and realistic fictional inventory so frontend agents can work without waiting for the live backend.
- **Founder B:** Create the repository, configure hosting and database, implement authentication foundations and database security rules.
- **Overseer:** Confirm the project builds, contracts match, and different organizations cannot access each other's private data.

Exit gate: Working project foundation, test database, seed data and green initial build.

### Phase 2 — Website interface

Days 2–4

Tasks LL-015 through LL-021

- **Founder A:** Coordinate branding, homepage, student search, result cards, claim screens, staff dashboard and reusable components.
- **Founder B:** Continue backend implementation independently using agreed API contracts.
- **Overseer:** Run visual consistency, mobile responsiveness, accessibility and navigation reviews.

Exit gate: Every important page is navigable and functional with mock data, including loading, empty and error states.

### Phase 3 — Real application workflows

Days 3–5

Tasks LL-022 through LL-030

- **Founder A:** Connect finished frontend screens to real backend endpoints, with working forms and status updates.
- **Founder B:** Implement found-item creation, photos, search endpoints, claim submission, staff approval, return statuses and activity logs.
- **Overseer:** Use a fresh test account to complete the entire workflow and verify that changes persist after page refresh.

Exit gate: A real found item can be added, discovered, claimed, approved and returned.

### Phase 4 — Smart AI matching

Days 5–6

Tasks LL-031 through LL-037

- **Founder A:** Build realistic search test cases and add clear explanations to the match result cards.
- **Founder B:** Implement initial structured matching, then semantic vectors, blended ranking, evaluation and fallback.
- **Overseer:** Measure whether relevant items rank highly, including cases where exact search words differ.

Exit gate: Matching succeeds on an agreed test set, wrong-organization items never appear, and AI failures do not break search.

### Phase 5 — Quality and security

Days 7–8

Tasks LL-038 through LL-045

- **Founder A:** Oversee automated browser tests, mobile layouts, accessibility, errors and usability.
- **Founder B:** Oversee permission tests, upload security, private claim data, reliability and malicious-input handling.
- **Overseer:** Independently verify each P0 feature against its acceptance criteria and reopen anything failing.

Exit gate: No known critical security issues or demo-blocking bugs; all essential tests pass.

### Phase 6 — Competition polish

Days 8–9

Tasks LL-046 through LL-051

- **Founder A:** Refine visuals, brand story, demo narrative, dashboard presentation and project pitch.
- **Founder B:** Prepare repeatable demo data, stable test accounts, matching evidence and operational reliability.
- **Overseer:** Act as an independent skeptical judge. Identify the three biggest remaining weaknesses.

Exit gate: A polished site with a clear product story and a reliably reproducible demo.

### Phase 7 — Deployment and submission

Days 9–10

Tasks LL-052 through LL-056

- **Founder A:** Rehearse the pitch, perform final UX checks and prepare approved presentation materials.
- **Founder B:** Validate the live deployment, production environment, rollback plan and locked demo release.
- **Overseer:** Complete a final production smoke test and verify submission requirements against the actual rubric.

Exit gate: Live URL works, demo is reliable, all required materials are submitted.

## 5. How to organize AI agents without chaos

I would not create dozens of autonomous agents all editing the same project simultaneously. You want a controlled agent hierarchy where builders create deliverables, reviewers verify them, and one integrator manages code changes.

- **You + Your Friend:** Final decisions, task assignment and acceptance
- **Project Overseer Agent:** Tracks dependencies, progress, blockers and milestone gates
- **Founder A:** UX Design Agent, Frontend Agent, Accessibility Agent, Pitch Agent
- **Founder B:** Database Agent, Backend Agent, Matching Agent, Deployment Agent
- **Independent review agents:** QA Tester, Security Red Team, Integration Lead, Judge Simulator

Approved changes → Main branch → Live website

### The five-status workflow

Try a task status

Not Started In Progress Blocked Review Done

Not Started

Task has not been assigned yet.

This is an example of the status system. Change the task statuses in the spreadsheet to track actual progress.

### Every AI agent must return evidence

For every task, require the agent to state which task ID it completed, what files it changed, what tests were executed, what those tests returned, where screenshots or a PR can be viewed, and which issues are unresolved.

A different reviewer should test the work. Never allow a coding agent to mark its own work complete without verification.

## 6. The feature most worth getting right: matching

The AI component should be useful, not just decorative.

### Example: AI matching versus traditional search

User describes their lost item

"I lost my dark gym bag with a white logo near the basketball court."

Semantic + structured matching

Black Nike duffel bag

Found near gym entrance

Bag • Dark color • Sports location

Black athletic backpack

Found in locker room

Possible match • Dark color

Illustrative results only, not real inventory or measured match scores.

Your Matching Agent should first deliver reliable keyword and attribute matching. Then it can add embeddings for meaning-based retrieval and use hybrid ranking to combine semantic and exact-match signals. Supabase documents both approaches.

Source label in PDF: Supabase Docs +1

One particularly important feature is human ownership verification. An AI match is not proof that an item belongs to someone. Staff should have access to private proof provided by the claimant, while the public listing should avoid exposing details someone could copy to make a fraudulent claim.

## 7. The competition-ready quality checklist

Before you consider LostLink finished, your QA agents should verify the following:

### Final release criteria

0 of 10 verified

0%

- [ ] A new visitor understands the product immediately
- [ ] A staff member can post a found item and photo
- [ ] Searching returns relevant items within the correct organization
- [ ] A claimant can submit private ownership evidence
- [ ] Staff can approve or reject a claim
- [ ] The item can be marked returned and its state persists
- [ ] Unauthorized users cannot view private claims or other organizations' data
- [ ] The website works on phone, tablet and desktop
- [ ] Automated critical user-flow tests pass
- [ ] The actual live website completes the competition demo

Reset example checklist

This in-chat checklist is temporary. The downloadable tracker is the project record.

File uploads need special attention: validate file types and sizes, enforce permissions, and protect uploads against abuse. OWASP provides detailed security recommendations for this.

Source label in PDF: OWASP Cheat Sheet Series

## 8. What you should do first

Your very first working session should produce these assignments:

| Assignment | Who | Agent |
| --- | --- | --- |
| LL-001 — Understand the competition rubric | Both | Product Strategist |
| LL-002 — Choose the showcase audience | Founder A | Product Strategist |
| LL-003 — Freeze the MVP | Both | Product Strategist |
| LL-005 — Define security/privacy decisions | Founder B | Security Architect |
| LL-006 — Define architecture and shared contracts | Both | Architecture Lead |
| LL-007 — Set up your progress board | Founder A | PM Overseer |

Work through these in dependency order, then give frontend and backend agents independent tasks.

My strongest recommendation is to build for one impressive demonstration set in a fictional school first, while designing the database to support schools, sports facilities and offices later. That keeps the pitch understandable and the implementation manageable.

The long-term product is a multi-organization lost-and-found platform. The competition version should prove one powerful thing:

A person can describe a lost item in ordinary language, discover a plausible match, safely submit a claim, and get their belongings returned through a simple digital workflow.

If LostLink makes that experience feel effortless, the design, AI engineering and business value all support the same compelling demonstration.
