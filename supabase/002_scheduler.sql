-- Run AFTER 001_schema.sql and AFTER the Vercel production deployment is Ready.
-- Enable pg_cron / pg_net via Supabase Integrations if your project requires it.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Replace both placeholders below. bot_cron_secret MUST equal Vercel CRON_SECRET.
-- Keep these values out of GitHub. Run this edited SQL only in your own SQL Editor.
select vault.create_secret('https://YOUR-VERCEL-DOMAIN.vercel.app', 'bot_app_url');
select vault.create_secret('YOUR_RANDOM_CRON_SECRET', 'bot_cron_secret');
select cron.schedule('ratneswar-bot-tick','* * * * *',$$
 select net.http_post(
 url:=(select decrypted_secret from vault.decrypted_secrets where name='bot_app_url' limit 1)||'/api/jobs/tick',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='bot_cron_secret' limit 1)),
 body:='{}'::jsonb,timeout_milliseconds:=55000);
$$);
-- Check invocations: select * from cron.job_run_details order by start_time desc limit 20;
-- HTTP results: select id,status_code,error_msg from net._http_response order by created desc limit 20;
-- Pause scheduler: select cron.unschedule('ratneswar-bot-tick');
-- Before re-running setup, unschedule old job and remove/update existing Vault secrets.
