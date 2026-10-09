# Deploying the Micronode chatbot backend (Cloudflare Workers AI — free)

This is a one-time setup, done entirely in the Cloudflare website — no command line needed.

## 1. Create a free Cloudflare account
Go to https://dash.cloudflare.com/sign-up and sign up (no credit card required for the free plan).

## 2. Create the Worker
1. In the Cloudflare dashboard, go to **Workers & Pages** in the left sidebar.
2. Click **Create** → **Workers** → **Create Worker**.
3. Give it a name, e.g. `micronode-chatbot`. Click **Deploy** to create it with the default "Hello World" code (you'll replace it next).
4. Click **Edit code** (opens the online code editor).
5. Select all the existing code and delete it.
6. Open `worker.js` from this folder, copy its entire contents, and paste it into the editor.
7. Click **Deploy** (top right) to save and publish.

## 3. Bind Workers AI to the Worker
1. Go back to the Worker's page → **Settings** → **Bindings** (sometimes under **Variables and Bindings**).
2. Click **Add binding** → choose **Workers AI**.
3. Set the binding name to exactly `AI` (the code expects `env.AI`).
4. Save. This is what gives the Worker access to the free LLM — no API key needed.

## 4. Copy the Worker's URL
On the Worker's overview page you'll see a URL like:
`https://micronode-chatbot.<your-subdomain>.workers.dev`

Copy it — you'll paste it into the website's chatbot widget config next (see `chatbot-widget.js`, the `CHAT_API_URL` constant near the top of the file).

## 5. Confirm the allowed origin
`worker.js` only answers requests coming from `https://micronode.in` and `https://www.micronode.in` (see `ALLOWED_ORIGINS` near the top of the file). If your site is hosted at a different domain, update that list before deploying.

## Cost & limits
- Workers (the function itself): free plan includes 100,000 requests/day.
- Workers AI (the model): free plan includes a daily allowance of "neurons" (Cloudflare's AI compute unit) — generous for a small business FAQ widget, resets every day, no card on file, no bill. If the daily allowance is used up, the widget will show a friendly "try again shortly" message instead of erroring.

## Updating the knowledge base later
If your products, pricing or services change, edit the `SYSTEM_PROMPT` text in `worker.js`, then paste the updated file into the Worker's **Edit code** screen again and click **Deploy**.

## Seeing what people ask (Chat Log)
Every question + reply is logged to a **"Chat Log"** tab in the same Google Sheet the "Start a project" form uses — see `apps-script/consult-form.gs` and `apps-script/README.md`. Asking the same question again updates that row's "Times asked" count and "Last asked" time instead of adding a new row, so the sheet stays one row per distinct question.

This needs **both** pieces redeployed together:
1. `apps-script/consult-form.gs` pasted into the Apps Script project and **redeployed as a new version** (same deployment, so the URL doesn't change).
2. `cloudflare-worker/worker.js`'s `APPS_SCRIPT_URL` constant must match that Apps Script web app's URL exactly, then the Worker redeployed (Quick Edit → paste → Save and Deploy).

If the Sheet doesn't get new chat rows after testing, check the Worker's live log stream for a "chat log failed" message — that usually means the URL doesn't match or the Apps Script deployment needs republishing.
