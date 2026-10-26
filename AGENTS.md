# AGENTS.md — Repository Instructions for All Agents

This file defines the default operating rules for every AI agent working in this repository. Follow more specific instructions in a subdirectory's `AGENTS.md` when working in that subdirectory, unless they conflict with the requirements below for safety, accuracy, or phase documentation.

## 1. Core working principles

- **Understand before editing.** Read the README, relevant design documents, configuration, existing tests, and nearby code before making changes.
- **Stay within scope.** Work only on the assigned phase and files necessary to complete it. Avoid unrelated refactors and formatting changes.
- **Preserve existing work.** Do not revert, overwrite, or delete another agent's changes without explicit authorization. Coordinate when multiple agents touch the same files.
- **Prefer small, reviewable changes.** Make the simplest correct change consistent with the repository's style, architecture, and conventions.
- **Verify claims.** Run relevant checks (tests, lint, type checks, builds) when possible. Clearly distinguish what passed, failed, and was not run.
- **Protect sensitive information.** Never record secrets, credentials, private keys, access tokens, or sensitive user data in code, commits, or agent reports.
- **Communicate clearly.** Document assumptions, decisions, open questions, risks, and effects on other phases.

## 2. Required identity and phase metadata

Before beginning a phase, determine and record:

| Field | Meaning | Example |
| --- | --- | --- |
| `agent_id` | Stable, unique identifier for the specific agent or agent instance; use lowercase kebab-case. | `codex-01` |
| `founder_version` | Version of **Founder** being used for this work, as supplied by the project or task owner. | `A or B` |
| `phase_number` | Zero-padded number for the assigned phase. | `02` |
| `phase_slug` | Short, descriptive lowercase kebab-case label. | `implementation` |

Use the Founder version from the task context or the repository's documented source of truth. **Do not invent a version.** If it cannot be established, use `unassigned` in the report path, explicitly mark the missing version as a blocker or open question, and update the path once the actual version is confirmed.

For parallel runs of the same agent type, use distinct IDs (for example, `codex-01` and `codex-02`). Keep the same `agent_id` throughout one run. If Founder changes during an assignment, use the version actually used for that phase and explain the transition in the report.

## 3. Mandatory phase folder and Markdown report

**Every agent MUST create a new folder and a Markdown file after completing each phase, before starting another phase or handing work to another agent.** This applies to planning, research, design, implementation, testing, review, documentation, and handoff phases. If a phase ends blocked, fails, or is abandoned, create the report anyway and mark its status accurately.

Use this exact naming scheme for **both** the folder and the file:

```text
agent-logs/
  <agent_id>__founder-v<founder_version>__phase-<phase_number>-<phase_slug>/
    <agent_id>__founder-v<founder_version>__phase-<phase_number>-<phase_slug>.md
```

Example:

```text
agent-logs/
  codex-01__founder-v1.4.0__phase-02-implementation/
    codex-01__founder-v1.4.0__phase-02-implementation.md
```

Naming rules:

1. Both names must include the **agent ID**, **Founder version**, and **phase number + name**.
2. Use lowercase letters, numbers, hyphens, and the double underscores shown above. Keep phase names descriptive and consistent across agents.
3. Do not combine different phases or agent instances into one report, and never overwrite another agent's report.
4. Commit or otherwise include these reports with the corresponding repository changes, unless the task explicitly requires a different handoff mechanism.
5. If an agent revisits a completed phase, update its own report with a dated addendum. If the revisit is a new assigned phase, create a new phase folder and file.

### Required report template

Copy this template into **every** phase Markdown file and fill it with concrete information. Do not leave headings blank: use `None` or `Not applicable` where appropriate.

```markdown
# Phase Report: <phase_number> — <phase_name>

## Metadata
- **Agent:** <agent_id> (<agent/tool/model description, if relevant>)
- **Founder version:** <founder_version>
- **Phase:** <phase_number> — <phase_name>
- **Status:** Completed | Blocked | Failed | Abandoned
- **Date (UTC):** <YYYY-MM-DD>
- **Task / issue:** <link or identifier, if available>
- **Branch / commit:** <branch name and commit hash, if available>

## Objective and scope
- **Goal:** <what this phase was intended to accomplish>
- **In scope:** <areas covered>
- **Out of scope:** <areas deliberately not touched>

## Work performed
- <specific actions taken, in order or grouped logically>
- **Files created or modified:** <paths and brief purposes>
- **Decisions made:** <important choices and their reasons>

## Validation and results
- **Commands / checks run:** <exact commands and outcomes>
- **Tests not run:** <what was skipped and why>
- **Deliverables:** <links or paths to outputs>

## Thoughts and reflections
- **What worked well:** <observations>
- **What was difficult or surprising:** <observations>
- **Trade-offs and alternatives considered:** <reasoning>
- **What I would improve next:** <concrete suggestions>

## Cross-agent and cross-phase comments
- **For agents on other phases:** <actionable notes; include target agent/phase if known>
- **Dependencies / assumptions:** <what downstream work relies on>
- **Risks / integration concerns:** <specific file, API, behavior, or design implications>
- **Questions / requested decisions:** <who should answer and what is needed>

## Follow-up and handoff
- **Remaining work:** <unfinished items and priorities>
- **Recommended next steps:** <clear, actionable instructions>
- **Relevant references:** <other phase reports, docs, issues, or commits>
```

**Be candid in reflections.** Record real technical reasoning, uncertainty, and useful lessons—not just a success summary. In cross-agent comments, name the affected phase or owner where possible and reference exact files, interfaces, decisions, or failing tests so other agents can act on the feedback.

## 4. Recommended workflow for each phase

1. **Orient:** Read the task, existing agent reports, relevant repository instructions, and impacted files. Identify the Founder version and choose your unique agent ID and phase designation.
2. **Plan:** State intended changes, dependencies, acceptance criteria, and any likely overlap with other agents. Raise conflicts before editing shared areas.
3. **Execute:** Make focused changes. Follow project conventions; add or update appropriate tests and documentation.
4. **Validate:** Run available relevant checks. Review the diff for unintended edits, secrets, and regressions. Do not claim unexecuted checks passed.
5. **Document:** Create the required phase folder and `.md` file, using the exact naming scheme. Include work performed, thoughts, and notes for agents working on other phases.
6. **Handoff:** Share the report path, summary, unresolved questions, and any blockers with the next agent or the task owner **before** proceeding to another phase.

## 5. Collaboration and handoff rules

- Treat existing reports as project context, not as unquestionable truth; verify facts against current code and tests.
- Read reports from upstream phases before depending on their decisions or artifacts.
- Explicitly flag assumptions that other phases may invalidate and breaking changes to APIs, schemas, data formats, or interfaces.
- When reporting a problem owned by another phase, provide reproduction steps or evidence, expected behavior, severity, and a proposed owner or next action.
- Do not silently change another phase's contract; document the issue and coordinate an agreed change.
- When blocked, preserve partial work safely and report exactly what remains blocked and what information or action will unblock it.

## 6. Definition of done for a phase

A phase is ready for handoff only when its scoped deliverables are complete or clearly marked blocked; relevant validation is reported accurately; the required **uniquely named folder and Markdown report** exist; the report includes actions, thoughts, and cross-agent comments; and the next agent can continue without guessing what happened.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 7. Shared orientation and coordination

Before editing, read [the agent hub](docs/coordination/README.md),
[the current-state snapshot](docs/coordination/current-state.md), and
[the integration checklist](docs/coordination/integration.md).
Confirm your actual branch and commit with Git; branch-specific handoffs describe
their own snapshot and may predate another founder's work.

Use [the coordination board](docs/coordination/task-board.csv) for shared
integration dependencies. Record your agent ID, branch, affected paths, status,
and handoff evidence before overlapping edits. All agents share `main` as the
canonical source of integrated work. Start each assignment from current `main`
and bring completed work back through a pull request targeting `main` promptly.
There is no requirement to create a separate branch or worktree per agent,
founder, or phase. Use the task's existing checkout and coordinate file ownership
before simultaneous edits; never overwrite another agent's uncommitted work.

### Shared branch and pull request workflow

1. Synchronize with `main` before starting. Check status and preserve local work
   before pulling; use fast-forward updates and stop to resolve divergence.
2. For related work, use one short-lived shared integration branch and one PR
   into `main`. Agents on that assignment contribute to the same branch, with
   disjoint file ownership recorded on the board. A PR needs a source branch
   distinct from its target; this temporary branch exists for review, not as a
   permanent founder or agent workspace. Unrelated changes may use focused PRs.
3. Serialize commits and pushes on a shared branch. Refresh its remote head
   before publishing; merge newer commits and resolve conflicts without
   discarding either contributor's work. Do not force-push shared history or
   switch/reset a checkout while another agent is using it.
4. Include all contributors' files and phase reports in the PR. Check the
   combined result with relevant tests/builds and inspect every conflict
   resolution and deletion. Keep both versions of independently written reports
   with clear attribution when their original paths collide.
5. Merge after required checks and review, with task-owner authorization where
   needed. Use merge commits when preserving existing branch ancestry. Then
   synchronize all agents to the updated `main`; retain historical branches
   until their commits and files are confirmed integrated.

Use `main` as everyone's common baseline and delivery destination. Direct
commits to `main` require an explicit task-owner instruction; ordinary work goes
through the shared PR so checks and review happen before integration.

Keep historical plans, reports, source references, and existing file paths.
Organize new shared guidance under `docs/coordination/`; link to original
artifacts rather than copying competing versions of contracts or moving active
source trees. A future move must preserve content and update imports, links,
scripts, and checks together.

The hub is a navigation and coordination layer. Existing phase-report rules
above remain required. A board row marked Done requires an independent review
reference; a delivered artifact awaiting review is Review. An implementation
contract on a branch is evidence of that branch's behavior, not proof that both
founders approved it or that it is deployed.
