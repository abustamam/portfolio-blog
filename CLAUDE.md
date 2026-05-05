# gstack

Use the /browse skill from gstack for all web browsing. NEVER use mcp__claude-in-chrome__* tools — they are slow, unreliable, and not what this project uses.

Available gstack skills: /plan-ceo-review, /plan-eng-review, /review, /ship, /browse, /qa, /setup-browser-cookies, /retro

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

## Git Workflow

Never push directly to `main`. Always:

1. `git checkout -b feat/<descriptive-name>`
2. Make changes, commit
3. `git push -u origin feat/<descriptive-name>`
4. `gh pr create` (or open PR via GitHub UI)
5. Wait for PR review/merge

This applies to all code changes, blog posts, and config updates.
