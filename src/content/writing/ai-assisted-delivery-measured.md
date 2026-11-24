---
# DRAFT OUTLINE (issue #34). `draft: true` keeps this out of production builds
# (see src/utils/content.ts: isPublished). Every [TODO(author): ...] must be
# replaced with real data or your own words, or removed, before flipping
# `draft` to false.
title: "Measuring AI-Assisted Delivery on Real Work"
description: "[TODO(author): one-sentence description, written after the numbers are in]"
pubDate: '2026-11-23' # TODO(author): set the real publish date
draft: true
dek: "[TODO(author): one-line subtitle — the headline finding, stated as narrowly as the data allows]"
tag: "AI"
kind: "Case Study"
---

<!--
OUTLINE NOTES (delete before publishing)
Purpose: follow up "Six Ways I Nearly Fooled Myself Benchmarking an AI Tool".
That post measured the mechanism (does the bundle contain the right files) and
ended on what it could not answer: the outcome (did the work get done better,
faster or cheaper). This post tries to measure the outcome on real work, using
the same habits: preregister, establish a noise floor, check the harness ran,
publish your own errors.
Rule for filling in: every number in this post must come from the collection
plan below. No placeholder number may survive to publication. If a metric could
not be collected, say so in the post instead of estimating it.
-->

*TL;DR*: [TODO(author): 2–3 sentences, written last. What was measured, over how much real work, and the one result you're confident in — plus the one you're not.]

The [last post](/writing/six-ways-i-fooled-myself-benchmarking/) ended on a question it couldn't answer. Recall measures the mechanism: does the bundle contain the right files. It doesn't measure the outcome: did the work ship faster, with fewer mistakes, for a cost worth paying.

This post is an attempt at the outcome, measured on real work instead of replayed git history. It is narrower than the question everyone wants answered, on purpose.

[TODO(author): one paragraph on what changed in how you work since the last post that made this measurable (e.g. agent instructions, review rounds, issue-per-change discipline). Link /writing/layered-agent-instructions/ only if it's relevant to the data.]

---

## What I can and can't claim

*Purpose: state the limits before the numbers, so the reader calibrates.*

Generic framing: one developer, a handful of repositories, tasks that are not comparable to each other. That rules out a clean causal answer to "does AI make delivery faster." What it doesn't rule out is measuring the parts of delivery that leave a trace, and reporting them with their noise.

[TODO(author): the exact scope — which repos, which date range, how many issues/PRs, which agent and model versions. Fill from the collection step.]

[TODO(author): the claim you're making, in one sentence, and the claim you're explicitly not making.]

---

## The measurement plan

*Purpose: preregister the metrics before looking at results, the same way the benchmark post held tasks back. Publish this section as written, with dates, even if the results disappoint.*

[TODO(author): date the plan was fixed, and where it lives (commit SHA or gist), so readers can see it predates the results.]

### Unit of work

One GitHub issue that ended in one merged PR. Issues are the unit because they exist before the work starts (the same reason the benchmark used issue text, not PR bodies). Work with no issue is excluded and counted, so the exclusion rate is visible.

[TODO(author): confirm this unit fits how you actually worked over the period; report how many PRs had no linked issue.]

### Metrics

Each metric has a source that exists without any AI tool's cooperation, because the last post showed a tool's own session records can be ~1% complete.

| # | Metric | What it measures | Source |
|---|--------|------------------|--------|
| 1 | Cycle time | Issue opened → PR merged, and first commit → PR merged | `gh` issue and PR timestamps |
| 2 | Review rounds | Number of fix rounds before merge | PR review events + pushes after first review |
| 3 | First-pass CI rate | Share of PRs whose first CI run was green | `gh pr checks` / Actions run history per PR |
| 4 | Escaped defects | Follow-up fix or revert PRs touching the same files within 14 days | git log + PR titles (`fix`, `revert`) cross-referenced by file |
| 5 | Agent claim accuracy | Share of agent "tests pass" / "done" claims that held when re-run | Session transcripts, sampled and re-checked by hand |
| 6 | Cost per merged PR | Tokens (and dollars) spent per merged PR | Agent session logs; billing export as a cross-check |
| 7 | Human review time | Minutes you spent reviewing and steering, per PR | Manual log (see below); the hardest metric to get honestly |
| 8 | Context recall on real work | Did the context bundle contain the files the PR changed | Bundle at session start vs. `gh pr diff --name-only` |

[TODO(author): cut any metric you won't collect. Add any you care about that's missing. Fix the list before collecting.]

### How to collect each one

*Purpose: make the plan reproducible. Commands below are sketches to adapt and verify, not tested scripts.*

**Cycle time, review rounds, first-pass CI (metrics 1–3).** Pull every merged PR in the window with its linked issue, then compute per PR:

```bash
# Sketch — verify fields and pagination before trusting the output.
gh pr list --repo OWNER/REPO --state merged --limit 500 \
  --search "merged:2026-12-01..2027-02-28" \
  --json number,title,createdAt,mergedAt,closingIssuesReferences,commits,reviews
```

[TODO(author): the script you actually ran, committed somewhere linkable, and its output row count checked against the PR count on GitHub.]

**Escaped defects (metric 4).** For each merged PR, list files changed, then search the next 14 days of merged PRs for `fix`/`revert` titles touching any of those files. Hand-check every match: a later fix to the same file is not always a defect in the earlier PR.

[TODO(author): measurement — number of PRs flagged, number confirmed as real escapes after hand-checking, and the false-positive rate of the automatic match.]

**Agent claim accuracy (metric 5).** Sample N sessions at random. For each claim of the form "tests pass", "build is green", "fixed", re-run the check at that commit and record held / did not hold / could not reproduce. This is the outcome version of "a failed invocation looks exactly like a miss."

[TODO(author): measurement — N sampled, claims found, share that held, with the sampling method stated.]

**Cost per merged PR (metric 6).** Sum token usage from the agent's session logs for sessions linked to each PR (by branch or worktree), and reconcile the total against the billing export for the same window. If the two disagree by more than a few percent, report the gap and use billing.

[TODO(author): confirm which fields your agent's logs record usage in, and how sessions map to PRs. Report the reconciliation gap.]

**Human review time (metric 7).** No tool records this. Options, in order of honesty: a timer started and stopped by hand per PR; calendar blocks; or skip it and say so. Don't reconstruct it afterwards from memory.

[TODO(author): which option you used, and how many PRs are missing a time entry.]

**Context recall on real work (metric 8).** Snapshot the bundle at the first agent turn of each session and compare it to the PR's changed files, with the same adjustments as the benchmark: drop bookkeeping files, count only files that existed at the branch point.

[TODO(author): measurement — mean recall on real work, compared with the 0.414 fresh-set figure from the last post. State whether the comparison is like-for-like.]

### Comparison baseline

*Purpose: decide what "better" is measured against, before seeing the data.*

There is no clean control group for one developer. Options, weakest to strongest:

- **Before/after:** the same metrics on your PRs from a window before you used agents heavily. Confounded by everything else that changed.
- **Within-period split by task type:** compare agent-heavy and hand-written PRs of similar size and type in the same window. Confounded by which tasks you chose to delegate.
- **Planned alternation:** for a fixed stretch, decide in advance (coin flip per issue, recorded before starting) whether to use the agent. Strongest, and the most expensive to run.

[TODO(author): which baseline you chose and why; if alternation, the number of issues in each arm.]

### Noise floor

*Purpose: the same check as the benchmark's split-half — how big must a difference be before it means anything?*

Split the PRs in one arm randomly in half, compute each metric for both halves, repeat many times, and report the spread. A difference between arms smaller than that spread is not a finding.

[TODO(author): measurement — the noise floor for each metric you report.]

---

## Results

*Purpose: the numbers, each next to its noise floor, with the sample size.*

| Metric | Agent-assisted | Baseline | Noise floor | n |
|--------|----------------|----------|-------------|---|
| Cycle time (median) | [TODO(author): measurement] | [TODO(author): measurement] | [TODO(author): measurement] | [TODO(author): measurement] |
| Review rounds (mean) | [TODO(author): measurement] | [TODO(author): measurement] | [TODO(author): measurement] | [TODO(author): measurement] |
| First-pass CI rate | [TODO(author): measurement] | [TODO(author): measurement] | [TODO(author): measurement] | [TODO(author): measurement] |
| Escaped defects | [TODO(author): measurement] | [TODO(author): measurement] | [TODO(author): measurement] | [TODO(author): measurement] |
| Cost per merged PR | [TODO(author): measurement] | n/a | n/a | [TODO(author): measurement] |

[TODO(author): agent claim accuracy and human review time reported separately, since they have no baseline column.]

---

## What the numbers say

*Purpose: interpretation, kept as narrow as the noise floor allows.*

[TODO(author): one paragraph per metric that cleared its noise floor. For the ones that didn't, say so plainly.]

---

## Where I nearly fooled myself this time

*Purpose: continuity with the last post — the errors you caught in your own measurement. Only real ones.*

[TODO(author): real examples from running this plan — harness bugs, metric definitions you had to change, results you nearly published. If you change a metric after seeing data, say when and why.]

---

## What this still doesn't answer

*Purpose: the honest boundary — same role as the last post's closing section.*

[TODO(author): what's still out of reach (e.g. code quality over months, whether a team would see the same thing), and what data would answer it.]

---

## If you want to measure this on your own team

*Purpose: something a reader can copy, the way the last post ended with a short checklist.*

[TODO(author): 4–6 lines distilled from the plan above, once you know which parts worked in practice.]

---

*[TODO(author): disclosure line — tools and models used, any relationship with their makers (the last post disclosed the CodeLedger design-partner role), and where the raw data and scripts are available.]*
