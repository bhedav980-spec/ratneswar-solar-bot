-- Run once in Supabase SQL Editor. A separate bot project is recommended.
create table public.bot_settings (
 id integer primary key check(id=1), chat_enabled boolean not null default true, ads_enabled boolean not null default false,
 phone text not null default '918128399432', welcome_text text not null default 'Ratneswar Solar Solutions માં આપનું સ્વાગત છે. તમારી માહિતી અમારી ટીમને મળી ગઈ છે. સોલાર વિશે તમારો પ્રશ્ન પૂછો. સંપર્ક: 8128399432',
 scheme_text text not null default 'સબસિડી તમારી પાત્રતા અને લાગુ સત્તાવાર નિયમો પર આધારિત છે. અમારી ટીમ તમારી વિગતો ચકાસીને જાણ કરશે. સંપર્ક: 8128399432',
 price_text text not null default 'કિંમત સિસ્ટમની ક્ષમતા, સામગ્રી અને સાઇટ પર આધારિત છે. અમારી ટીમ તમારું ક્વોટેશન આપશે.',
 reminder_template text not null default '', reminder_language text not null default 'gu',
 updated_at timestamptz not null default now());
insert into public.bot_settings(id) values(1);
create table public.networks(id uuid primary key default gen_random_uuid(), name text not null, area text not null default '', category text not null default '',url text not null unique, status text not null default 'unverified' check(status in('unverified','reviewed','join_requested','joined','approved','rejected')),permission_note text not null default '', created_at timestamptz not null default now());
create table public.campaigns(id uuid primary key default gen_random_uuid(),name text not null,caption text not null,poster_path text not null default '',starts_at timestamptz not null,ends_at timestamptz not null,enabled boolean not null default false,template_name text not null default '',template_language text not null default 'gu',created_at timestamptz not null default now(),check(ends_at>starts_at));
create table public.leads(id uuid primary key default gen_random_uuid(),phone text not null unique,name text not null default '',address text not null default '',bill text not null default '',stage text not null default 'new',status text not null default 'pending' check(status in('pending','yes','no')),marketing_consent boolean not null default false,consent_source text not null default '',consent_at timestamptz,opted_out boolean not null default false,last_inbound_at timestamptz,next_reminder_at timestamptz,reminder_count integer not null default 0,source text not null default 'whatsapp',created_at timestamptz not null default now());
create table public.messages(id text primary key,lead_id uuid references public.leads(id),direction text not null check(direction in('in','out')),body text not null default '',delivery_status text not null default 'received',created_at timestamptz not null default now());
create table public.jobs(id uuid primary key default gen_random_uuid(),kind text not null check(kind in('reply','reminder','broadcast')),lead_id uuid references public.leads(id) not null,campaign_id uuid references public.campaigns(id),payload jsonb not null default '{}',run_at timestamptz not null default now(),status text not null default 'queued' check(status in('queued','processing','sent','cancelled','failed','unknown')),dedupe_key text not null unique,provider_id text,error text,claimed_at timestamptz,created_at timestamptz not null default now());
create index jobs_due on public.jobs(status,run_at);
create table public.group_posts(id uuid primary key default gen_random_uuid(),campaign_id uuid references public.campaigns(id) not null,network_id uuid references public.networks(id) not null,status text not null default 'pending' check(status in('pending','shared','cancelled')),shared_at timestamptz,unique(campaign_id,network_id));
create table public.activity(id bigint generated always as identity primary key,event text not null,detail jsonb not null default '{}',created_at timestamptz not null default now());
-- All access is through authenticated, email-allowlisted server APIs. No anon/user table access.
do $$ declare t text; begin foreach t in array array['bot_settings','networks','campaigns','leads','messages','jobs','group_posts','activity'] loop execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon,authenticated',t); end loop;end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('posters','posters',false,5242880,array['image/png','image/jpeg']) on conflict(id) do nothing;
-- Atomic webhook deduplication and lead update. STOP stops queued outreach immediately.
create function public.receive_message(p_id text,p_phone text,p_profile text,p_body text,p_received_at timestamptz,p_stop boolean) returns boolean language plpgsql security definer set search_path=public as $$
declare l public.leads;begin
 perform pg_advisory_xact_lock(hashtext(p_phone));
 if exists(select 1 from messages where id=p_id) then return false;end if;
 insert into leads(phone,name,stage,last_inbound_at) values(p_phone,left(coalesce(p_profile,''),120),case when coalesce(p_profile,'')='' then 'name' else 'address' end,p_received_at) on conflict(phone) do update set last_inbound_at=greatest(leads.last_inbound_at,excluded.last_inbound_at) returning * into l;
 insert into messages(id,lead_id,direction,body) values(p_id,l.id,'in',left(p_body,2000));
 if p_stop then update leads set opted_out=true,marketing_consent=false,status='no',next_reminder_at=null where id=l.id;update jobs set status='cancelled',error='Customer opted out' where lead_id=l.id and status='queued' and kind<>'reply';end if;
 insert into jobs(kind,lead_id,payload,dedupe_key) values('reply',l.id,jsonb_build_object('text',left(p_body,2000),'first',(select count(*)=1 from messages where lead_id=l.id and direction='in')),'reply:'||p_id) on conflict(dedupe_key) do nothing;return true;end $$;
-- Serialize claims. Expired/ambiguous sends require review, never an automatic duplicate retry.
create function public.claim_job() returns setof public.jobs language plpgsql security definer set search_path=public as $$
begin perform pg_advisory_xact_lock(778123);
 update jobs set status='unknown',error='Worker interrupted; inspect provider history before retrying' where status='processing' and claimed_at<now()-interval '5 minutes';
 if exists(select 1 from jobs where status='processing') then return;end if;
 return query update jobs set status='processing',claimed_at=now() where id=(select id from jobs where status='queued' and run_at<=now() order by case kind when 'reply' then 0 when 'reminder' then 1 else 2 end,run_at,created_at for update skip locked limit 1) returning *;end $$;
create function public.enqueue_reminders() returns void language plpgsql security definer set search_path=public as $$
declare l public.leads;begin
 if not exists(select 1 from bot_settings where id=1 and chat_enabled and reminder_template<>'') then return;end if;
 for l in select * from leads where status='pending' and marketing_consent and not opted_out and next_reminder_at<=now() for update skip locked loop
 if not exists(select 1 from jobs where lead_id=l.id and kind='reminder' and status in('queued','processing','unknown','failed')) then insert into jobs(kind,lead_id,dedupe_key) values('reminder',l.id,'reminder:'||l.id||':'||l.next_reminder_at) on conflict(dedupe_key) do nothing;end if;end loop;end $$;
create function public.complete_job(p_id uuid,p_provider text) returns void language plpgsql security definer set search_path=public as $$
declare j public.jobs;begin select * into j from jobs where id=p_id for update;if j.status<>'processing' then return;end if;
 update jobs set status='sent',provider_id=p_provider where id=p_id;
 if j.kind='reminder' then update leads set reminder_count=reminder_count+1,next_reminder_at=case when status='pending' and marketing_consent and not opted_out then now()+interval '3 days' else null end where id=j.lead_id;end if;end $$;
create function public.enqueue_campaign(p_campaign uuid) returns integer language plpgsql security definer set search_path=public as $$
declare c public.campaigns;n integer;begin
 select * into c from campaigns where id=p_campaign;if not found then raise exception 'Campaign not found';end if;
 if not c.enabled or c.template_name='' then raise exception 'Enable campaign and configure an approved image template';end if;
 insert into jobs(kind,lead_id,campaign_id,run_at,dedupe_key) select 'broadcast',id,c.id,greatest(c.starts_at,now()),'campaign:'||c.id||':'||id from leads where marketing_consent and not opted_out and status='pending' on conflict(dedupe_key) do nothing;get diagnostics n=row_count;return n;end $$;
-- Only service_role can call these functions, including through PostgREST.
revoke all on function public.receive_message(text,text,text,text,timestamptz,boolean) from public,anon,authenticated;
revoke all on function public.claim_job() from public,anon,authenticated;
revoke all on function public.enqueue_reminders() from public,anon,authenticated;
revoke all on function public.complete_job(uuid,text) from public,anon,authenticated;
revoke all on function public.enqueue_campaign(uuid) from public,anon,authenticated;
grant execute on function public.receive_message(text,text,text,text,timestamptz,boolean),public.claim_job(),public.enqueue_reminders(),public.complete_job(uuid,text),public.enqueue_campaign(uuid) to service_role;

grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

create table public.integration_secrets(id text primary key,ciphertext text not null,updated_at timestamptz not null default now());
alter table public.integration_secrets enable row level security;
revoke all on public.integration_secrets from anon,authenticated;
grant all on public.integration_secrets to service_role;
