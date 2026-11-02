# Ratneswar Bot — pehli baar setup

## Kya diya hai
Next.js dashboard + backend, Supabase SQL, public-web search, uploaded posters/captions, customer chatbot, 3-day reminder queue, Excel import aur WhatsApp connection form.

IMPORTANT: Existing WhatsApp groups mein auto-join / auto-post is code mein NAHI hai. Public links save honge; group joining/sharing manual tasks hain. Excel ke sirf naam/number wale contacts save honge; promotional consent ke bina automatically message nahi jayega.

## 1 — ZIP extract karo
`ratneswar-solar-bot` folder ke ANDAR ki files GitHub repository ke root mein daalni hain. ZIP file upload nahi karni. `package.json` root par dikhna chahiye.

## 2 — Supabase schema
Naya bot project kholo → SQL Editor → `supabase/001_schema.sql` ka poora text paste → Run ONCE. Purane ERP par mat chalana.

## 3 — Admin user
Supabase → Authentication → Users → Add user. Apna email/password set karo aur email confirm karo. Yehi dashboard login hoga.

## 4 — Vercel environment
Existing `ratneswar-solar-bot` project → Settings → Environment Variables. README ki table ke hisaab se Supabase URL/publishable/server secret, ADMIN_EMAILS, APP_URL, CRON_SECRET aur INTEGRATION_ENCRYPTION_KEY add karo. Search ke liye BRAVE_SEARCH_API_KEY bhi chahiye.
Secrets khud settings mein bharo; GitHub ya chat mein mat bhejo. Random secrets generate karne ki command README mein hai.

## 5 — Code deploy
GitHub `main` par source commit karo. Vercel Framework Next.js, Root Directory repository root. Deployment Ready hone ka wait karo. Env baad mein badle to Redeploy karo.

## 6 — Login
Vercel Visit se app kholo aur step 3 ke admin se login karo.

## 7 — WhatsApp test connection
Meta app/WhatsApp Business Platform mein pehle TEST number setup karo. Phone Number ID, token, App Secret aur supported Graph version lo. Dashboard → Bot & connections mein bharo. Apna random verify token bhi save karo. Save → Test API connection.
Ye QR connection nahi hai. Existing 8128399432 account ko delete/unregister mat karo. Production onboarding/coexistence route pehle check karo.

## 8 — Webhook
Dashboard se callback URL copy → Meta mein callback + SAME verify token → verify → messages subscription. Test recipient se WhatsApp message bhejo aur reply/customer record check karo.

## 9 — Template + scheduler
Meta mein approved Gujarati reminder template aur image campaign template banao. Exact expected structure README mein diya hai. Dashboard mein approved names/language save karo.
`supabase/002_scheduler.sql` mein YOUR-VERCEL-DOMAIN aur YOUR_RANDOM_CRON_SECRET ko actual values se replace karke SQL Editor mein run karo. Secret Vercel CRON_SECRET ke barabar hona chahiye. Edited secrets GitHub mein commit mat karo.

## 10 — Apna ad
Poster mein 8128399432 hona chahiye → upload → Gujarati caption → start/end → campaign enable → global Advertising enable. Consented contacts ke liye Queue contacts dabao. Group sharing tasks manual hain.
Customer bot ads band hone par bhi chal sakta hai. Reminder 3 din baad consented Pending lead ko jayega. Yes/No ya STOP se band hoga. Imported contacts ke liye template download karo aur consent/evidence columns samajhkar bharo.

## Test results
Build/TypeScript, core logic aur embedded PostgreSQL queue tests automated hain. Supabase/Meta/Vercel ke real accounts par end-to-end sending abhi verify nahi hai. Configuration aur real account testing ke bina ise live-running bot mat samajhna.

Poore details ke liye README.md dekho.
