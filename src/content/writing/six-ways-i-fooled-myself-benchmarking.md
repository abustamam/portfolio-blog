---
title: "Six Ways I Nearly Fooled Myself Benchmarking an AI Tool"
description: "I spent a month measuring whether a context-selection tool picks the right files. The tool got better. My benchmark kept lying to me."
pubDate: '2026-08-18'
dek: "Building a benchmark from your own git history is easy. Keeping it honest is the hard part."
tag: "AI"
kind: "Case Study"
---

A friend built a CLI that picks context for coding agents. You give it a task, it scores every file in your repo and hands the agent a bundle of the ones that matter. He asked me to help build a community around it.

I said no.

Not because I doubted it — because I couldn't prove it worked, even for myself. Building an audience on something I hadn't verified seemed like a good way to spend credibility I'd rather keep.

So I measured it instead. Twelve releases later, here's the method, the numbers, and — more usefully — the six ways I nearly fooled myself.

---

## The method

The nice thing about a context selector is that you already have thousands of labelled examples sitting in your git history. Every bug fix is a task description paired with the exact set of files that turned out to matter.

So for each historical fix in [GavelUp](https://gavelup.app), my meeting-runner app for Toastmasters clubs — a TypeScript/Postgres codebase with about 35 tables — I did this:

- Take the GitHub issue's title and body as the task. That's the artifact that existed **before** anyone wrote the fix, so nothing leaks backwards.
- Check out a worktree at the fix's **parent** commit.
- Ask the tool for a bundle.
- Compare its predicted files against what the fix actually changed.

Two adjustments make the number honest. Bookkeeping files that every change touches — changelogs, lockfiles, generated route trees — come out of the ground truth. And recall counts only files that *already existed* at the parent commit, because no tool can predict a file that a commit creates.

That's it. A hundred lines of bash and a git worktree.

---

## What it found

The tool improved a lot over the versions I tracked, and the series is real — same harness, same tasks, same machine throughout.

| Release | Mean recall | Tokens |
|---|---|---|
| 0.10.49 | 0.155 | 11,328 |
| 0.10.51 | 0.481 | 6,010 |
| 0.10.56 | 0.438 | 10,297 |
| 0.10.59 | 0.616 | 7,800 |
| 0.10.62 | 0.624 | 7,734 |
| 0.10.69 | 0.685 | 11,621 |

Along the way it caught things worth catching. An install that failed closed and left a dangling symlink on your PATH. An upgrade command that printed "Done!" and didn't upgrade. And the one that mattered most: a release where the tool told the agent it had **sufficient** context, at its highest confidence level, on a bundle containing none of the nine relevant files.

That one had a findable cause. The confidence score rewarded bundles forming a coherent slice of the dependency graph — and a one-file bundle is trivially 100% coherent. The metric was rewarding degeneracy. It got fixed at the root a release later.

All of which felt like a well-run experiment. Then I checked my own work.

---

## Six ways I nearly fooled myself

**Your test set becomes their dev set.** I reported findings by issue number, release after release. He fixed them. By version twelve, a confidence fix for "single isolated file" bundles was precisely the shape of the task I'd been quoting since version one.

That's good engineering and a ruined instrument. A task you report stops measuring the tool and starts measuring how well your specific case got patched. I rebuilt the benchmark with 30 fresh tasks he'd never seen, reported from 12 of them, and held 18 back permanently. Not out of distrust — because a year from now, neither of us could otherwise tell the difference.

**Easy tasks inflate the headline.** Five of my fourteen tasks had three or fewer relevant files, where recall 1.000 is close to automatic. Four scored exactly that. Strip them out and the same binary on the same set drops from **0.685 to 0.510**. On a fresh set with a floor of four relevant files, it reads **0.414**.

I'd been reporting the inflated number for six consecutive releases.

**Pull request bodies leak the answer.** Building the new set, I pulled tasks from commit subjects referencing `#123`. In a squash-merge repo that's usually the *PR* number, not the issue — and a PR body describes the implementation, often naming the files it touched. Feeding that in as "task text" hands the tool the answer sheet. Sixteen of my first thirty candidates were PRs.

**A failed invocation looks exactly like a miss.** My first run of the new set scored 0.276 and I nearly published it. Ten of thirty tasks had returned *empty* bundles, because my harness called a repo-local wrapper that doesn't exist at commits predating the tool's own adoption.

In the results file, a crashed invocation and a genuine total miss are the same thing: an empty list and recall 0.000. Fixing it moved the set to 0.356. Check that your harness actually ran the thing.

**Small denominators manufacture correlations.** I nearly reported that the tool's confidence score was *anti*-correlated with its accuracy — a Pearson r of −0.262, which would have sent someone chasing an inversion that didn't exist. It was driven entirely by one-file tasks where recall 1.000 is trivial. Restricted to meaningful denominators, the correlation was indistinguishable from zero in either direction.

**The tool can't tell you whether it helped.** Eventually I tried the obvious thing: forget synthetic tasks, just check whether the bundles built during *real* work contained the files I actually ended up editing.

The data wasn't there. Five session records from 379 activations, every one with an empty `files_changed` and an outcome of `unknown`. The schema was exactly right. The capture rate was about 1%.

---

## The part I'd most want you to copy

Two things came out of this that I think generalize.

The first is that I published my own correction. The 0.685 I'd been sending for six releases was inflated by my task selection, not by anything in the tool. I sent a retraction and republished the corrected figures. A benchmark writeup with no self-corrections in it isn't a benchmark writeup — it's marketing with a chart.

The second is that I **tested** the contamination worry instead of asserting it. It would have been easy, and satisfying, to write "he's been overfitting to my benchmark." Instead I controlled for both the difficulty floor and repo vintage and measured the gap between tasks he'd seen and tasks he hadn't: **−0.096**, below the ~0.10 noise floor I got by splitting a set randomly in half, with a bootstrap confidence interval spanning zero.

No detectable overfitting. I'd stated the hypothesis loudly enough that reporting the negative result mattered. A correction record that only ever finds fault in the other guy's code isn't a correction record.

---

## What none of this answers

Recall measures the **mechanism** — does the bundle contain the right files. It does not measure the **outcome** — did the agent do better work, faster, for less money. Those come apart: a bundle can miss three files that didn't matter, or catch nine and miss the one that did.

At one developer with wildly heterogeneous tasks, a clean causal answer to "did this make me better" is out of reach. That's not a dodge. It's the same reason individual developer-productivity claims are almost universally unfalsifiable — and it means the honest claim is narrower than the one everyone wants to make.

---

## Where it stands

On a fresh, appropriately-hard set of tasks, the tool finds roughly four in ten relevant files from an issue description alone, at around 11k tokens. That's a starting point for an agent, not a replacement for search.

And it's measured on **one** TypeScript repository by **one** developer, which is the first thing any stranger should ask about and the thing I still can't answer.

If you're evaluating anything in this category, here's the short version: build the benchmark from your own git history, hold half of it back from whoever ships the tool, floor your task difficulty, verify your harness actually invoked the thing, and publish your own errors with the same prominence as theirs.

The traps above cost me about three false conclusions. Two of them I'd already written down before I caught them.

---

*Disclosure: I'm a design partner on the tool in question ([CodeLedger](https://github.com/codeledgerECF/codeledger)) and hold a referral link, which I've deliberately left out of this post. The maintainer had no review over this writeup and saw the corrected numbers at the same time as everyone else. Raw results and the harness script are available on request.*
