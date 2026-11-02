# Ratneswar Solar Solutions — Bot dashboard

Brand: **Ratneswar Solar Solutions**. Poster/inquiry contact: **8128399432**.
Stack: Next.js / TypeScript → GitHub → Vercel; Supabase Postgres, Auth and private Storage; official Meta WhatsApp Cloud API.

## Read this before deployment

This is deployable application source, NOT an already connected WhatsApp bot. You must configure your Supabase project, confirmed admin user, Vercel environment, Meta account, approved templates and scheduler. Live message delivery needs testing with your own account.

### Implemented

- Password login through Supabase Auth; server-side confirmed-email admin allowlist; HttpOnly session cookies.
- Public-web discovery through Brave Search API, automatic saving of discovered names/links, manual join/review/permission statuses.
- Your PNG/JPG poster upload, your Gujarati caption, IST display, start/end times, campaign and global ad pause.
- WhatsApp credentials connected and tested from dashboard, encrypted with AES-256-GCM in Supabase. No QR login.
- Manual group sharing tasks: open group, download poster, copy caption and bot inquiry link, mark shared.
- Official incoming WhatsApp webhook with signature verification and duplicate-message protection.
- Gujarati deterministic conversation: greet → name/profile → address → bill → explicit marketing/reminder consent → configured FAQ replies. This is a rule-based bot, not a general AI assistant.
- Customer directory, conversation history, name/number/address, Pending / Yes / No and reminder count.
- Reminder every 3 days after consent, independent of advertising schedule. Yes, No or customer STOP stops reminders/outreach.
- .xlsx import (500 rows / 2 MB per batch), phone validation, consent evidence, duplicate skipping and per-row errors.
- Consented contact campaign queue with approved image marketing template; no automatic campaign sending just from import.
- Persisted jobs, serialized claims, bounded batches, accepted vs delivered/read statuses and error review.

### Not implemented / not claimed

- WhatsApp has no public directory exposed by this app. Public-web search will not find all groups, private groups or members.
- Arbitrary existing local WhatsApp group **auto-join and auto-post are not implemented**. Saving/joining a group manually does not make it an official Cloud API destination. Group tasks are explicitly manual. No member-number extraction.
- No Embedded Signup / one-click Meta OAuth onboarding. Initial Meta account/app/phone setup is required; credentials are entered in dashboard.
- No inference of customer address: the customer must supply it. Display/profile names can be edited only through future extensions; current customer flow collects the data.
- No guaranteed zero downtime, exact-second scheduling or guaranteed reach. External services, rate limits, approved templates and your account eligibility affect execution.
- No poster generation: you upload the image and provide the Gujarati caption, as requested.
- Dashboard lists latest 1,000 leads, 500 networks, 100 campaigns and 200 jobs. Data remains in Supabase. Pagination is a future enhancement.

## 1. GitHub repository

Create a **private** repository named `ratneswar-solar-bot`.

Unzip the supplied ZIP. Upload the **CONTENTS** of `ratneswar-solar-bot/` to the repository root, not the ZIP and not an extra nested folder. Root must contain `package.json`, `app/`, `components/`, `lib/`, `supabase/` and `README.md`.

Commit to `main`. Do not upload `node_modules`, `.next`, `.env.local`, real API keys, customer files or passwords. `.env.example` contains placeholders only.

Using Git instead of browser upload:

```bash
cd ratneswar-solar-bot
git init
git add .
git commit -m "Add Ratneswar bot dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ratneswar-solar-bot.git
git push -u origin main
```

## 2. Supabase project

1. Create a NEW project `ratneswar-solar-bot`. Do not run this schema on your existing ERP project.
2. SQL Editor → New query → paste `supabase/001_schema.sql` → Run **once**. It creates tables, private `posters` bucket and service-only queue functions.
3. Authentication → Users → Add user → create your admin email/password and confirm the email (or complete the emailed confirmation).
4. Disable public signups if only you administer this bot. The app has no signup form. Configure SMTP for reliable password recovery if needed; password reset can be done through Supabase administration initially.
5. Project settings → API: copy Project URL, publishable key and server secret key.
6. Verify the private `posters` Storage bucket exists. No public bucket or anonymous database access is needed.

All data/file operations go through authenticated admin server routes or signed Meta webhooks. Client has no direct table privileges. RLS is enabled; no permissive anon policies are installed. Encryption is not a substitute for protecting the Supabase service secret.

## 3. Vercel setup

1. Import GitHub repository `ratneswar-solar-bot` into your existing Vercel project (or connect it under Settings → Git).
2. Framework: **Next.js**. Root directory: repository root. Node.js: **22.x or supported newer LTS**. Build: `npm run build`; leave output directory at framework default.
3. Add these Environment Variables for Production (and Development if testing locally):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable API key |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret |
| `ADMIN_EMAILS` | Confirmed admin email, comma-separated for more admins |
| `APP_URL` | Full stable Vercel production URL, without trailing slash |
| `CRON_SECRET` | Random 32+ byte secret used by scheduler |
| `INTEGRATION_ENCRYPTION_KEY` | Exactly 64 hexadecimal characters from 32 random bytes |
| `BRAVE_SEARCH_API_KEY` | Optional; required for automatic public-web search |

Generate secrets locally (run twice for two independent secrets):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Deploy. If adding/changing environment variables later, redeploy.
5. Add the production URL to Supabase Auth → URL Configuration as Site URL; keep redirect allowlist restricted to your domains. Current password flow does not require an OAuth callback.
6. Open dashboard and log in using the confirmed Supabase admin account.

**Important:** Production webhook and `/api/jobs/tick` must be reachable by Meta and Supabase. Vercel deployment protection must not intercept those external calls. Use the stable production domain and appropriate protection settings. Dashboard APIs themselves enforce admin authentication.

Vercel plan, business-use terms, function duration limits and third-party pricing must suit your commercial usage. There is no always-on browser or local WhatsApp Web process.

## 4. Connect WhatsApp through dashboard

Do NOT delete/unregister your existing WhatsApp Business account to try this code. First test using Meta's provided test number. Check current Meta onboarding/coexistence eligibility before connecting 8128399432.

1. In Meta for Developers, create/select your business app, add WhatsApp and associate your business portfolio / WhatsApp Business Account as required by your onboarding flow.
2. Start with the provided test phone number and add your own testing recipient.
3. Obtain **Phone Number ID** (not the actual mobile number), an appropriate access token, app secret and currently supported Graph API version from Meta. For production use a properly scoped long-lived/system-user token with access to the correct assets; test tokens expire.
4. Open dashboard → **Bot & connections**. Enter those four values and a webhook verification secret of your choosing. Save. The verify token is a random shared secret, NOT an access token.
5. Click **Test API connection**. This verifies a Meta read operation for the supplied number; it does not prove webhook subscription or template delivery.
6. Copy dashboard callback URL: `https://YOUR_DOMAIN/api/whatsapp/webhook`.
7. In Meta webhook configuration, enter this callback and the SAME verification token. Subscribe to the `messages` field and the appropriate WhatsApp Business Account.
8. Send a message from your testing recipient to the Meta test number. Check customer appears and receives the Gujarati prompt. Complete address/bill/consent flow.
9. Settings → inquiry number must match the number customers can actually message. During test-number development, update this setting for testing links; keep the marketing contact printed on final uploaded posters as 8128399432.
10. After all tests and current onboarding checks, connect your actual business number. App secret, API token and verify token should be kept private.

Optional alternative: put `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_GRAPH_VERSION` in Vercel environment variables. Saved encrypted dashboard values take precedence. No token is returned to the browser after saving. Preserve the encryption key across deployments/backups.

## 5. Approved Meta templates

Messages outside the customer service window use approved templates. A customer starting a chat is not automatically recorded as consenting to marketing. This bot explicitly asks for reminders and handles STOP.

### Reminder template

Create a Gujarati **marketing** template without variables, e.g. name `ratneswar_solar_reminder`, language `gu`. Suggested body (submit for Meta approval; approval is not guaranteed):

> Ratneswar Solar Solutions તરફથી સોલાર વિશે વધુ માહિતી જોઈએ છે? અમારી ટીમને જવાબ આપો અથવા 8128399432 પર સંપર્ક કરો. રિમાઇન્ડર બંધ કરવા STOP લખો.

In dashboard settings enter approved template name and exact language. The worker sends it every 3 days for eligible pending contacts. First due date is three days after opt-in/import, then three days after an API-accepted reminder. Actual delivery may fail or be delayed; count reflects accepted sends, while conversation history displays delivery status. Failed/unknown jobs need admin review and are not repeatedly auto-retried.

### Poster campaign template

Create an approved marketing template, e.g. `ratneswar_solar_offer`, language `gu`:

- Header: **IMAGE**.
- Body: approved fixed introduction plus **two text variables, in this order**: `{{1}}` = Gujarati caption; `{{2}}` = WhatsApp inquiry URL.
- Fixed closing includes 8128399432 and STOP instruction.
- Provide sample image and variable examples during Meta submission.

The worker supplies uploaded image as a temporary signed URL and exactly these two body parameters. Using a different template structure will fail. Template review can reject highly variable promotional content; use a suitably approved template and adapt server payload if your approved format differs.

## 6. Scheduler: unattended operation

Vercel serves requests; it is not a permanent bot loop. Supabase Cron calls `/api/jobs/tick` every minute to process a bounded batch. Customer webhook also schedules a small processing batch after saving incoming messages; cron is the recovery path if that work is interrupted.

1. Deploy dashboard and configure credentials first.
2. Open `supabase/002_scheduler.sql` locally. Replace production URL and secret placeholders. The scheduler secret MUST match `CRON_SECRET` in Vercel.
3. Run edited SQL in Supabase SQL Editor. Never commit the real edited secret to GitHub.
4. Verify `cron.job_run_details` and `net._http_response` show successful execution / HTTP 200.
5. In dashboard, click **Run due batch now** and confirm status changes.

This implementation prioritizes replies, then reminders, then campaigns. Claims are globally serialized for predictable contact state. It is suitable for small initial campaigns, not high-volume bulk delivery. Each tick processes up to eight due jobs, with a time budget; provider and function limits affect throughput. Scheduler delay is around a minute under normal conditions, not exact-second delivery. Upgrade queue execution capacity before large campaigns.

## 7. Daily workflow

1. Network discovery → enter village/keywords → Search → review public results → save.
2. Open invite/source manually. Record joined/reviewed status. Record posting permission before setting **approved**.
3. Campaigns → upload poster already containing contact number → enter your caption → start/end times → template → save.
4. Enable campaign AND global Advertising. **Queue contacts** adds one job per consented pending customer per campaign.
5. Group sharing → choose approved network and campaign → add task → during campaign window manually share poster and copied caption/link. Mark manually shared afterwards. The app never claims this was API-posted.
6. Customer follows link and messages bot → lead and conversation are recorded. Ads pause does not pause customer chat.
7. Customers & reminders → select **Yes** (converted) or **No** (closed) to stop outreach. STOP from customer also stops it. Pending without consent does not receive reminders.
8. Excel import → download blank .xlsx template → fill name, phone, optional address/consent/evidence → upload. Names/numbers alone are stored but not automatically messaged. Existing numbers and prior opt-outs are not overwritten.
9. Review queue errors. A status of **unknown** may mean Meta accepted a message before a network/DB failure. Check provider history before using verified retry. No exactly-once delivery guarantee is possible across a remote messaging API and your database.

Pause stops future submissions; messages already submitted to Meta cannot be recalled. A status/STOP change racing with an in-flight API request may not prevent that single request. Late webhook delivery likewise affects when opt-out is observed.

Reminder failed/unknown jobs block new reminders for that contact until resolved. For an unknown actually delivered message, reconcile provider_id, job status, reminder_count and next_reminder_at in Supabase only after inspecting provider history; automatic retries are intentionally avoided. The current dashboard offers verified NOT-sent retry, not a full reconciliation editor.

## 8. Local run and validation

```bash
npm ci
cp .env.example .env.local
# Fill local environment values, never commit .env.local
npm test
npm run build
npm run dev
```

Tests include pure bot logic and an embedded PostgreSQL (PGlite) schema/queue test with mock storage schema. This is not a live Supabase/Meta integration test. No real messages are sent by tests.

## Troubleshooting

- **No Production Deployment:** commit source to connected repository's production branch; inspect Vercel Build Logs.
- **Missing server setting:** fill environment and redeploy. Do not paste keys into chat or client code.
- **Login failed:** confirm Auth user email, allowlisted email and correct project's URL/keys.
- **Bucket/table missing:** run `001_schema.sql` on the same Supabase project configured in Vercel.
- **Webhook verification fails:** stable URL reachable, saved verification token matches Meta, app/database configured.
- **No reply:** check subscribed messages field, Phone Number ID match, signature secret, bot enabled, scheduler/job errors and token validity.
- **Template rejected/failed:** exact approved name/language/structure, valid image, consent, rate limits and production account permissions.
- **Search empty:** public search cannot enumerate WhatsApp; try another village/language/keyword. API account and quota required.
- **Imported contact not messaged:** consent/evidence, pending status, approved campaign template, ad/campaign toggles, time window, explicit queue and worker are all required.

## Files

- `components/Dashboard.tsx`: dashboard and controls.
- `app/api/admin`: authenticated operations.
- `app/api/whatsapp/webhook`: signed incoming messages/statuses.
- `app/api/jobs/tick`: scheduler endpoint.
- `lib/worker.ts`: processing, templates, re-checks and send results.
- `lib/core.mjs`: Gujarati state machine and eligibility rules.
- `supabase/001_schema.sql`: storage/DB/functions.
- `supabase/002_scheduler.sql`: minute tick setup.

Official references:
- https://vercel.com/docs/git
- https://vercel.com/docs/environment-variables
- https://supabase.com/docs/guides/auth/quickstarts/nextjs
- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/database/extensions/pg_net
- https://developers.facebook.com/documentation/business-messaging/whatsapp
- https://business.whatsapp.com/policy

Do not use unverified subsidy amounts in bot replies or posters. You control uploaded content; confirm the applicable official terms before publishing a scheme claim.
