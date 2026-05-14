# Blog Voice Guide

## Tone: Authoritative, Expert-Led Instruction

This blog teaches systems design and infrastructure concepts. The voice is that of an experienced practitioner explaining how things work — not a peer learning alongside the reader.

---

## The Shift

| From (collaborative) | To (authoritative) |
|---------------------|-------------------|
| "Let's build this together" | "This is how it works" |
| "I added Redis and here's what happened" | "Adding Redis broke the p99 — here's why" |
| "What you build" | "What this builds" |
| "Here's what I found" | State the finding directly |
| "We'll cover..." | "This post covers..." |
| "You might want to consider..." | "Use connection pooling" |
| "I didn't want to think too much about..." | "The choice was deliberate..." |
| "I went with..." | "The choice: ..." |
| "I tested this by..." | "Testing used..." |
| "I'll take that trade" | "That trade is acceptable" |
| "Let's learn together!" | Omit |

---

## Rules

1. **No first-person journey narratives.** The post is not a travelogue. State decisions and outcomes directly.
2. **No "we" for shared learning.** Use "we" only for genuine team decisions. Use declarative statements for everything else.
3. **No hedging.** "I think", "probably", "maybe", "kind of", "sort of" — remove all of them.
4. **No reader-directed imperatives disguised as collaboration.** "Let's measure" → "Measure first." "You'll see" → "The result is."
5. **State trade-offs as facts, not opinions.** "In my opinion, Redis is better" → "Redis is the right choice here because..."
6. **Disclose AI assistance plainly.** "Code is AI-scaffolded." Not "I used AI to help me."

---

## Examples

**Bad:**
> "I decided to use Hono because I didn't want to think too much about the stack. Let me show you why it works."

**Good:**
> "The stack choice is deliberate: Hono is the simplest framework that provides OpenAPI specs."

**Bad:**
> "We'll be using docker compose to manage services. My docker-compose.yml looks like this:"

**Good:**
> "Docker Compose manages the services. The docker-compose.yml:"

**Bad:**
> "I tested this by hammering the endpoint with a loop, and you'll see that the first 10 returned 201."

**Good:**
> "Testing used a simple loop. The first 10 requests returned 201; the remaining 5 returned 429."

---

## When "I" Is Acceptable

- In the AI-scaffolded disclosure: "I used AI to scaffold..."
- In the series intro bio (on the about page, not in posts)
- In personal reflection that is explicitly marked as such (rare)

In technical posts, "I" should almost never appear.

---

## Consistency Checklist

Before publishing, verify:
- [ ] No "let's", "we'll", "we're" (except genuine team decisions)
- [ ] No "I added", "I built", "I found", "I chose"
- [ ] No "you'll", "you'll see", "you might"
- [ ] No "follow along", "learn together", "journey"
- [ ] No hedging words ("probably", "maybe", "I think")
- [ ] All decisions stated as facts with reasoning
- [ ] Measurements stated as findings, not personal discoveries
