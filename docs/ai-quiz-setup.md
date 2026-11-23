# AI quiz: response collection setup

`/ai-quiz` is static. It POSTs each response as JSON to a Google Apps Script web
app, which appends a row to a Google Sheet you own. Until you set the endpoint,
the quiz still runs and shows a "responses aren't being collected yet" notice.

Status: the page's no-endpoint path is covered by a Playwright test (MEASURED).
The Apps Script side has not been deployed or exercised against a real Sheet
(ASSUMED until you run step 5).

## 1. Create the Sheet and script

1. Go to <https://sheets.new> and name the sheet, e.g. `AI cohort intake`.
2. **Extensions → Apps Script.**
3. Delete the starter code and paste in all of
   [`scripts/ai-quiz-apps-script.gs`](../scripts/ai-quiz-apps-script.gs).
4. Save (⌘S / Ctrl+S).

## 2. Deploy it as a web app

1. **Deploy → New deployment.**
2. Gear icon → **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. **Deploy**, then approve the permission prompt (Google will warn that the app
   is unverified. That's expected for your own script: **Advanced → Go to …**).
5. Copy the **Web app URL**. It ends in `/exec`.

"Anyone" means anyone can POST rows, not read them. The Sheet stays private.

## 3. Check the deployment

Open the `/exec` URL in a browser. You should see:

```json
{"ok":true,"service":"ai-quiz"}
```

## 4. Point the site at it

Either:

- **Commit it** (simplest, since the Docker build has no build args): paste the URL
  into the fallback string in [`src/consts/aiQuiz.ts`](../src/consts/aiQuiz.ts), or
- **Set it at build time:** `PUBLIC_AI_QUIZ_ENDPOINT=https://script.google.com/macros/s/…/exec bun run build`.
  For the Docker/CI build you'd also need to add an `ARG`/`ENV` to the `Dockerfile`.

The URL ends up in the public page either way. That's fine: it only accepts writes.

## 5. Test end to end

1. `bun run dev`, open <http://localhost:4321/ai-quiz>, complete the quiz.
2. The result screen should say "Thanks, your answers were sent."
3. A new row should appear on the `Responses` tab (created on the first submit).

If the result screen says the answers didn't send, open the browser console for
the error, and in Apps Script check **Executions** for the failed run.

## Updating the script later

Edits only go live after **Deploy → Manage deployments → ✏️ → Version: New
version → Deploy**. This keeps the same `/exec` URL. Creating a *new*
deployment gives you a new URL, which you'd then have to update on the site.

## Notes

- Responses include name/contact only if the person filled them in. Treat the
  Sheet as private; don't share it beyond whoever runs the cohort.
- A hidden `website` field catches basic bots; the script drops those rows.
- Cells that start with `=`, `+`, `-` or `@` are stored as text, so a response
  can't inject a formula.
