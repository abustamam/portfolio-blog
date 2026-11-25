---
# DRAFT OUTLINE (issue #34). `draft: true` keeps this out of production builds
# (see src/utils/content.ts: isPublished). Every [TODO(author): ...] must be
# replaced with your own words or removed before flipping `draft` to false.
title: "What a Founding Engineer Decides in the First 90 Days"
description: "[TODO(author): one-sentence description for listings and RSS, written once the post exists]"
pubDate: '2026-11-23' # TODO(author): set the real publish date
draft: true
dek: "[TODO(author): one-line subtitle — the single idea a reader should leave with]"
tag: "Startups"
kind: "Essay"
---

<!--
OUTLINE NOTES (delete before publishing)
Purpose: back the homepage claim ("I've been the first engineer") with the
decisions themselves, not a résumé. The reader is a technical or non-technical
founder deciding whether to hire a first engineer, or a senior engineer about to
become one.
Rule for filling in: every anecdote, number, company detail or claim of
experience is yours to write. The framing prose below makes no claims about what
happened; keep it that way or replace it.
Possible structure check: each decision section = what the decision is, why it
is hard to reverse, what you actually chose and why, what you'd choose now.
-->

*TL;DR*: [TODO(author): 2–3 sentences. Which decisions in the first 90 days were expensive to reverse, and what is the one you'd tell a new founding engineer to get right first?]

The first engineer at a startup makes a small number of decisions that everyone after them inherits. Most of them don't look like decisions at the time. They look like picking a database before lunch.

This post is about those decisions: which ones matter in the first 90 days, which ones can wait, and how to tell the difference.

[TODO(author): framing anecdote — the moment you realized a "small" early choice had become permanent. From Edvo or another zero-to-one role; name the choice, not just the feeling.]

---

## Who this is for

*Purpose: tell the reader in two sentences whether this post is for them.*

Founders hiring their first engineer, and engineers about to be that hire. No particular stack is assumed.

[TODO(author): confirm audience; add one line on what this post is not (e.g. not a hiring guide, not a stack recommendation).]

---

## The only question that matters early: what is expensive to undo?

*Purpose: give the reader the sorting rule the rest of the post uses — reversible vs. hard-to-reverse decisions.*

Generic framing: a decision is worth slowing down for when reversing it later costs more than getting it roughly right now. Most early choices are cheap to change. A few are not, and they are not always the ones that look important.

[TODO(author): your own rule of thumb for telling them apart, in your words.]

[TODO(author): one example of a decision you over-thought that turned out to be cheap to change, and one you under-thought that wasn't.]

---

## Days 1–30: the data model

*Purpose: argue that the data model is the hardest thing to change later, and show how you approached it.*

[TODO(author): real example from Edvo — why you started with the data model (the work entry says a graph in Firestore built for real-time collaboration). What alternatives did you consider, and what made you pick this one?]

[TODO(author): what the data model got right, with a concrete consequence (e.g. something it made easy later — the work entry says three apps ended up on one data model).]

[TODO(author): what it got wrong or what you'd change, and what it cost when you found out. Avoid inventing a migration story; only include if it happened.]

Questions worth answering on day one, regardless of stack:

- What are the core nouns, and which of them will users share with each other?
- Which reads need to be fast, and which writes must never be lost?
- What would have to be true for this schema to survive the second product?

[TODO(author): keep, cut or rewrite the list above so it reflects what you actually ask.]

---

## Days 1–30: what you build first, and what you deliberately don't

*Purpose: show the scoping decision — the first version, and the list of things left out on purpose.*

[TODO(author): real example — what was the first thing you shipped, how long it took, and what you explicitly chose not to build yet.]

[TODO(author): one item from the "not yet" list that turned out to matter sooner than expected, if any.]

---

## Days 30–60: boring infrastructure choices

*Purpose: cover the choices that are cheap to make well and expensive to make badly — hosting, auth, deploys, environments, backups.*

Generic framing: early on, the right infrastructure is usually the one the team can operate without thinking about it. The decision to make is less "which tool" than "what will we refuse to run ourselves."

[TODO(author): what you chose for hosting/deploys/auth at the start, and why. Only list what you actually used.]

[TODO(author): one infrastructure decision you'd make differently, with the reason.]

---

## Days 30–60: how code gets reviewed and shipped when there is one engineer

*Purpose: cover working agreements — review, testing, deploy cadence — before there is a team to need them.*

[TODO(author): how you handled review and testing as the only (or first) engineer. Did anyone review your code? What did you test, and what did you skip?]

[TODO(author): what you put in place before the second engineer arrived, and whether it held up.]

---

## Days 60–90: the first hire and the habits they inherit

*Purpose: cover the shift from building alone to building with others — onboarding, documentation, mentoring.*

[TODO(author): real example from Edvo — the work entry says you mentored junior developers and shaped how the team worked. What specifically did you change or set up as the team grew?]

[TODO(author): one habit you're glad you set early, and one you wish you had.]

---

## Days 60–90: saying no to the founder

*Purpose: cover the relationship decision — how a founding engineer pushes back on scope, timelines or technology choices.*

Generic framing: a founding engineer is often the only person in the room who can say what something will cost to build. That makes "no" and "not yet" part of the job.

[TODO(author): a real disagreement with a founder or stakeholder (anonymize if needed), what you said, and how it resolved. Skip this section if you don't have one you're willing to share.]

---

## What can wait

*Purpose: the reassuring half — decisions that feel urgent in the first 90 days but are cheap to defer.*

[TODO(author): your list of things that can wait (examples to consider, keep only those you believe: microservices, a design system, perfect CI, multi-region, a custom auth system). One line each on why.]

---

## A checklist for your first 90 days

*Purpose: something a reader can copy. Short, imperative, one line each.*

[TODO(author): 6–10 items distilled from the sections above, in the order you'd do them. Write after the sections are filled in so it matches.]

---

## Closer

*Purpose: tie back to the homepage positioning without a sales pitch.*

[TODO(author): closing paragraph — what you'd tell yourself on day one, and (optionally) one line linking to /work/edvo/ and the fractional founding engineer offer.]

---

## Further reading

[TODO(author): 3–5 links you actually recommend on early-stage engineering decisions.]
