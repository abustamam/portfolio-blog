# Log analysis with AI: a checklist for IT

Someone on your team wants to use the company's Microsoft Copilot to read
application logs and find errors. This kit shows one safe way to do it:
**scrub first, then analyze.** The AI only ever sees a copy of the log with
private values replaced by placeholders.

Everything in this folder is synthetic. `sample-logs/app.log` is an invented
web shop; its emails use the reserved `example.com` domains, its IPs are the
documentation ranges, and its card numbers are public test numbers.

## What is in the kit

| File | What it is |
| --- | --- |
| `sample-logs/app.log` | About 200 lines of fake log, with fake private values in it |
| `sample-logs/app.scrubbed.log` | The same log after the scrub script ran |
| `scrub/scrub.ps1` | The scrub script for Windows PowerShell 5.1 or PowerShell 7 |
| `scrub/scrub.py` | The same rules in Python 3, for non-Windows machines |
| `prompts.md` | Three Copilot prompts for the scrubbed log |

Both scripts are short plain text, make no network calls, and install
nothing. Please read them before anyone runs them.

## How it runs

1. The log stays where it is. Export it to a work machine as usual.
2. Run the scrub on that machine:
   `powershell -ExecutionPolicy Bypass -File .\scrub\scrub.ps1 -InputPath .\app.log -OutputPath .\app.scrubbed.log`
3. A person reads a sample of the scrubbed file before it goes anywhere.
4. Only the scrubbed file goes into Copilot, signed in with a work account.
5. The raw log is never emailed, uploaded or pasted.

## The checklist

- [ ] The scrub runs on a company machine, before any AI step.
- [ ] Only the company's licensed Copilot is used, signed in with a work
      account. No personal Copilot, ChatGPT or other consumer accounts.
- [ ] Someone reads a sample of every scrubbed file before it is shared.
- [ ] The scrub rules cover the private values your logs actually hold
      (see "What the scrub does not catch" below). Add rules to both scripts.
- [ ] Your AI policy says whether scrubbed logs are allowed, and who decides.

## Questions to ask about your Copilot and Microsoft 365 setup

- Does enterprise data protection apply to Copilot Chat for our users, and
  how can a user tell that it is on?
- Are prompts, responses and uploaded files kept? Where, and for how long?
  Which retention policies apply to them?
- Who can see a user's prompts and responses (for example through audit logs
  or eDiscovery), and is that acceptable for log content?
- Is web search (web grounding) on for Copilot? If so, can parts of a prompt
  be sent to a search service outside our tenant?
- Which data classification do application logs fall under, and does our
  policy allow that class in Copilot once scrubbed?

## What the scrub does not catch

The rules replace bearer tokens and JWTs, `api_key=` values, email addresses,
card-like numbers, IPv4 addresses and user IDs in the `usr_...` format. They
do **not** catch names or addresses in free text, phone numbers, IPv6
addresses, session cookies, or IDs in any other format. Regexes are a first
pass, not a guarantee: look at your own logs, add the rules they need to both
scripts, and keep reading samples.

Every user ID becomes the same `<USER_ID>`, so the AI cannot tell users apart.
If you need to count distinct users, that is a change to make on purpose (for
example numbered placeholders), not by putting raw IDs back.
