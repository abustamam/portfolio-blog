# Prompts for Microsoft Copilot

Use these only on a log that has been through the scrub script, and after you
have read a sample of the output. Use your company's Copilot, signed in with
your work account, not a personal AI account.

Paste the prompt, then paste the scrubbed log (or attach the scrubbed file)
underneath it. Try them on `sample-logs/app.scrubbed.log` first so you know
what a good answer looks like.

## 1. Group the errors and count them

```text
You are helping me read an application log. Private values in it have already been replaced with placeholders such as <EMAIL>, <IP>, <USER_ID>, <TOKEN> and <CARD>. Do not try to guess the original values.

List every distinct error and warning in the log. Treat lines as the same problem when only the request ID, time or user differs.

Give me a table with these columns: problem (in plain words), component (the word in [brackets]), level, count, first seen, last seen, one example line.

Count from the log itself, not from estimates. A stack trace (the lines starting with "at" or an exception name) belongs to the error just above it; do not count it as a separate problem. If anything is unclear, say so under the table.

Here is the log:
```

## 2. Rank them by impact and suggest likely causes

```text
Using the same scrubbed log, rank the problems by impact on customers. Impact means: how many requests failed, and whether the failure blocks something a customer is trying to do (checking out, signing in, viewing an order).

For each problem, give:
- rank and the problem in one line
- what it breaks for a customer
- the most likely cause, based only on what the log shows, labeled "likely" or "a guess"
- the log lines that support it
- the first thing an engineer should check

Every user shows as <USER_ID>, so you cannot tell users apart; do not claim how many different people were affected. If the log does not show enough to name a cause, say "not enough in the log" instead of inventing one.

Here is the log:
```

## 3. Compare two time windows

```text
Using the same scrubbed log, compare two time windows: before and after the line that says "rolling out" (a deploy). If there is no such line, compare the first half of the log with the second half and tell me the split time you used.

Give me a table with these columns: problem, count before, count after, change (new / gone / more / fewer / same).

Then write three sentences for a manager who is not technical: what changed, whether the deploy is the likely reason, and what to look at first. Do not overstate it: one log is evidence, not proof.

Here is the log:
```
