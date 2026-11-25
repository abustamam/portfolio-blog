---
title: "Where Agent Lessons Go to Die (and How I Got Mine Out)"
description: "Everything I'd learned about working with coding agents was stuck in the file where I first wrote it down. I collected 1,746 lessons from two machines and sent each one only where it applies."
pubDate: '2026-11-23'
dek: "Agent instruction files drift apart the moment you have more than one. Layers, and a loop that keeps them in sync, fix it."
tag: "AI"
kind: "Case Study"
---

Every time a coding agent burns me, I write the lesson down. A test suite that skipped everything and reported green. A wait loop that sat for hours on a syntax error. A piped command that swallowed a failure and said `exit 0`.

The problem is *where* I write it down. Whatever file is closest: the repo's `CLAUDE.md`, the machine's global instructions, or the agent's own memory folder for that project. Each of those is a place a lesson goes to die.

- A rule in one repo's instruction file never reaches the other repos, even when it has nothing to do with that repo.
- A machine's global file never reaches the other machine.
- The per-project memory folders never leave the machine at all. One repo on my workstation had about fifty memory entries, and most of them were about the shell, `gh`, or verification habits, not the repo.

So I'd learn the same lesson twice, on two machines, in two slightly different words. Then the two versions would drift.

This post is about the fix: one versioned source, split into layers, with a loop that collects lessons from everywhere and sends each one only to the places it applies.

---

## Four layers

Not every lesson is the same kind of true. "Report the number, not the verdict" holds everywhere. "Unquoted variables don't word-split" holds on a machine whose shell is zsh. "Prisma's migration snapshot can go stale" holds wherever Prisma is in play. "This repo's dev server runs on port 4321" holds in one repo.

Those are four layers, and each gets a home that loads only where it's true:

| Layer | What goes there | Where it lives | How a machine gets it |
|---|---|---|---|
| **Universal** | Habits that hold in any repo on any machine | One global instructions file | `git pull` + an install script that symlinks it |
| **Machine** | Facts about one host: OS, shell, hardware, network | One file per hostname, imported by the global file | Same script, picks the file by `hostname` |
| **Stack** | Gotchas for a tool: Bun, Prisma, Docker, Postgres… | Skills, one per stack | A private plugin marketplace |
| **Project** | Rules that only make sense in one repo | That repo's own instruction file | Git, which already does this |

The interesting constraint is on the top layer.

### The universal layer has to stay short

Every line in the global file loads into every session, in every repo, before the agent has read a word of the task. It's the most expensive real estate in the system. Twenty lines that are always true beat two hundred lines the agent has to filter.

So the universal file is one line per rule, with no evidence. Mine has 22 rules. The long version of each, with the incidents behind it, lives in a skill that loads only when it's relevant: the verification skill loads when the agent is about to say "it worked," the shell skill loads when it's about to background a command.

The same logic is why stack knowledge goes into skills rather than the global file. A Temporal gotcha costs nothing in a repo that doesn't use Temporal, because it never loads there.

### Layers compose

The layers also let a rule be general without being vague. The universal file says:

> Never trust the exit code of a pipeline. Use `pipefail`, the pipe-status array, or run the command bare.

The machine file for my workstation adds the fact that makes that rule actionable there:

> The shell is zsh: `PIPESTATUS` is empty (use `pipestatus`).

Neither line belongs in the other file. Together they're exactly right on that machine, and the first one is still right on a machine running bash.

---

## The loop: collect, consolidate, distribute

Layers are only a filing scheme. The part that actually fixes drift is a loop that moves lessons out of the places they were written and back out to where they apply.

### 1. Collect, read-only, everywhere

I wrote one prompt and ran it in every repo I actively use, on both machines, plus once in each home directory for the global file and memory folders. It reads the instruction files and the memory folder and emits one entry per lesson:

```text
### <one-line rule, imperative>
- scope: universal | machine | stack:<tech> | project
- evidence: the incident or measurement behind it; "none stated" if none
- source: <file path>
- status: MEASURED | ASSUMED (ASSUMED if the source doesn't say)
- sensitive: yes/no
```

Three instructions in that prompt did most of the work:

- **Read only; change nothing.** Collection runs in every repo on every machine. None of them should be editing anything.
- **Don't merge, don't drop, don't paraphrase away the evidence.** The collector is the wrong place for judgment. It sees one repo; consolidation sees all of them.
- **Never copy a secret value.** Name it, never print it.

The raw output went into comments on a tracking issue, never into the repo. Every machine pulls the repo, and the harvest from one machine describes projects that have no business landing on the other.

Seven runs across two machines produced **1,746 entries**: 519 tagged universal, 158 machine, 433 stack, and 636 project.

### 2. Consolidate, once, in one place

One pass over all of it, with three rules:

- **Merge duplicates and keep every piece of evidence.** The same rule from three repos becomes one line backed by three incidents. That's stronger than any of them alone.
- **When two rules conflict, demote both.** Never pick a winner silently. Both go back to project scope and into a `CONFLICTS.md` file until I decide.
- **Nothing in a shared layer may reveal a private project.** The universal file, the host files and the skills reach every machine. A rule that can't be worded without naming what a project is stays in that project.

The conflict rule earned its keep. Three came up. The best example: one source said that after a stacked branch's parent is squash-merged, you `rebase --onto` the child. Another said merge `main` into the child instead. Both had incidents behind them. If the consolidator had picked one, I'd have lost the other repo's evidence and never known there was a question. Demoted, it waited for me, I decided it, and the winner went into the git skill with its reason: merge, because `rebase --onto` needs a force-push, which other rules and some permission checks refuse.

The output: **22 universal rules, about 30 facts per machine, and 36 skills holding 560 rules**, grouped into four plugins: one for the long form of the workflow habits, and three for stacks (web, infra, data). Then I deleted from each repo's instruction file whatever had moved up a layer, so every rule lives in exactly one place.

### 3. Distribute, idempotently

An install script does three things, and is safe to run any number of times:

1. Symlinks the universal file to the agent's global instructions path. If a real file is already there, it's moved to a timestamped backup, not overwritten.
2. Symlinks the host file matching `hostname` next to it. A machine with no host file gets an empty one to fill in.
3. Registers the plugin marketplace (or updates it if it's already registered) and installs every plugin it lists.

Updating a rule is now: edit it in the repo, then on each machine `git pull && ./claude/install.sh`. Because the global files are symlinks, most edits don't even need the script; the pull is enough.

---

## Four rules, with their evidence

Every rule in the system carries a tag: **MEASURED** if something measured it, **ASSUMED** if it's a judgment or an untagged note. Here are four from the universal layer, with the evidence that put them there.

**Report measurements, not verdicts.** "It rendered" is a verdict. The pixel standard deviation is a measurement. "Server ready" is a verdict; the PID holding the port is a measurement. A wrapper's status says nothing about the thing it wraps. The incident behind it: a cheaper model, delegated a render job, reported success on 49 frames that were solid black. Its "done" was true about the script it ran and false about the output. *(ASSUMED: the incident is real, but nobody counted how often verdicts lie.)*

**Never trust the exit code of a pipeline.** `cmd | tail` reports the status of `tail`. A piped typecheck hid real errors behind `&& echo OK`. A piped deploy watch reported exit 0 for a failed deploy. A background `pytest | tail` notified success while its last line said tests had failed. *(MEASURED.)*

**Prove a test bites by reverting the source.** Revert the fix, or comment out the guard, and watch the test fail. Then restore it. A test that passes against known-broken code is evidence about the test, not the code. The sharpest case: a stub that ignored its selector argument made every mutation byte-identical, so a whole mutation matrix passed while testing nothing. *(MEASURED.)*

**Never poll.** Instead of re-reading a log every few minutes to see whether a job is "still running," run one background command that exits when the condition is met, and wait for it. And prove its probe first: run it once in the foreground, make it exit on any error or empty result, give it a deadline. Five watchers failed in five different ways before that last part became a rule: quoting, a short commit SHA, shell word-splitting, a shared timestamp and an empty result. One sat for hours waiting on a condition its own syntax error guaranteed would never come true. *(The no-polling habit is ASSUMED; the probe failures are MEASURED.)*

Notice that none of these is about a specific tool. They're about the gap between *the agent said it happened* and *it happened*, which is the gap almost every one of my 1,746 entries was circling.

---

## What I'd do differently

**Tag at write time, not at harvest time.** Of the roughly 590 tagged rules in the final system, only 85 are MEASURED. Most of the rest are probably true, but at the moment I wrote them down I didn't record whether I'd measured anything. A harvest can't recover that. If every memory entry had carried a tag from day one, the system would know far more about how much to trust itself.

**Design the collection prompt for the second run.** I wrote it for one big sweep. But memory folders keep growing, and a second harvest will re-emit every lesson that's already been consolidated. The prompt should take the current layers as input and emit only what's new or contradicts them.

**Check the install on every machine from a fresh session.** On my workstation I opened a new session in a sample repo and confirmed the expected files and skills loaded. On the second machine I ran the script but didn't independently check what loaded. "The script exited 0" is exactly the kind of wrapper status the first rule above tells me not to trust.

## What's still open

- One home-directory harvest is missing, and two repos on the second machine still hold rules that have since moved up a layer. Until they're trimmed, those rules live in two places — the drift this whole system exists to stop.
- Nothing enforces that the universal file stays short. Right now it's a line in a README. It should be a check that fails when the file grows past a budget.
- There's no cadence for re-collecting. "When a memory folder has grown a lot" isn't a trigger anything can fire on.

The fix for scattered lessons turned out to be the same as the fix for scattered code: one source of truth, explicit boundaries about what goes where, and a build step that puts each piece where it's used. The difference is that code has a compiler to tell you when the pieces disagree. Instructions just quietly drift, until an agent follows the stale one.
