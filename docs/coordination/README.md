# Shared agent hub

This is the common starting point for all LostLink agents. It organizes existing
work without moving or deleting original artifacts.

## Start every assignment here

1. Read [repository instructions](../../AGENTS.md) and the task from the owner.
2. Start from current `main` and follow the shared PR workflow in AGENTS.md.
   Confirm `git status --short`, `git branch --show-current`, and
   `git log -1 --oneline`. Preserve any existing uncommitted work.
3. Read [current state](current-state.md), then the relevant
   [phase documents](../README.md) and upstream reports.
4. Find your area in the [repository map](repository-map.md). Record a unique
   agent ID, working branch, affected paths, and dependencies in the
   [coordination board](task-board.csv) before shared integration edits.
5. Check the actual code against the [integration checklist](integration.md).
   Record unresolved differences rather than treating proposals as agreement.
6. Make the scoped change, run relevant checks, and create the required
   [phase report](../../agent-logs/README.md). Hand off with file paths,
   commands/results, open decisions, and a commit or PR.

## Where shared facts live

| Information | Location |
| --- | --- |
| Agent rules and report format | [AGENTS.md](../../AGENTS.md) |
| Project description | [Root README](../../README.md) |
| Navigation to plans and handoffs | [Documentation index](../README.md) |
| Inspected branches and delivery limits | [Current state](current-state.md) |
| Existing paths and proposed routing of work | [Repository map](repository-map.md) |
| Contract differences and integration acceptance | [Integration checklist](integration.md) |
| Shared tasks, owners, status, evidence | [Coordination board](task-board.csv) |
| Historical work and candid handoffs | [Agent reports](../../agent-logs/README.md) |

Update the affected shared entry when a merge, decision, blocker, or verified
result changes it. Cite a commit, PR, report, or command result. Historical
phase boards and reports stay intact; do not rewrite them to imply later work
was already available.

## Status and decisions

Use Not Started, In Progress, Blocked, Review, or Done. Delivered work awaiting
independent acceptance is Review. Do not infer review, deployment, or agreement
from a branch name, a successful mock test, or a phase number.

The routing suggestions in the repository map do not assign people or authorize
extra features. The task owner assigns work; the shared board records actual
ownership. This hub does not authorize launching additional agents.
