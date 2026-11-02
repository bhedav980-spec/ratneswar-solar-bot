import {db,rpc,patch,settings,send,signedPoster,log} from './server';
import {nextReply,canRemind,inWindow,waLink,isStop} from './core.mjs';
export async function work(limit=8){await rpc('enqueue_reminders');const started=Date.now();const outcomes=[];for(let i=0;i<limit&&Date.now()-started<35000;i++){const rows=await rpc('claim_job');const job=rows?.[0];if(!job)break;let attempted=false;let providerId:string|undefined;try{
 const s=await settings();let lead=(await db('leads','?id=eq.'+job.lead_id))[0];if(!lead)throw Error('Lead missing');let payload:any;
 if(job.kind==='reply'){
 if(!s.chat_enabled){await patch('jobs',job.id,{status:'queued',run_at:new Date(Date.now()+60000).toISOString(),claimed_at:null,error:'Customer bot paused'});continue;}
 const text=job.payload.text||'';let result:{patch:Record<string,any>,reply:string};
 if(job.payload.first&&!isStop(text))result={patch:{stage:lead.name?'address':'name'},reply:lead.name?'નમસ્તે '+lead.name+'! Ratneswar Solar Solutions માં આપનું સ્વાગત છે. તમારું ગામ/શહેર અને સરનામું જણાવશો?':'Ratneswar Solar Solutions માં આપનું સ્વાગત છે. તમારું નામ જણાવશો?'};
 else result=nextReply(lead,text,s);
 // An older reply job must never reverse a STOP already recorded by a newer webhook.
 if(lead.opted_out){delete result.patch.marketing_consent;delete result.patch.opted_out;delete result.patch.next_reminder_at;}
 if(Object.keys(result.patch).length)await patch('leads',lead.id,result.patch);
 if(!inWindow(lead)){await patch('jobs',job.id,{status:'cancelled',error:'24-hour reply window expired'});continue;}
 payload={type:'text',text:{body:result.reply.slice(0,4096)}};
 }else{
 if(!s.chat_enabled){await patch('jobs',job.id,{status:'queued',run_at:new Date(Date.now()+60000).toISOString(),claimed_at:null,error:'Customer bot paused'});continue;}
 if(!canRemind(lead,s)){await patch('jobs',job.id,{status:'cancelled',error:'Lead closed, opted out, no consent, or bot paused'});continue;}
 if(job.kind==='reminder'){
 if(!s.reminder_template)throw Error('Approved reminder template is not configured');payload={type:'template',template:{name:s.reminder_template,language:{code:s.reminder_language}}};
 }else{const c=(await db('campaigns','?id=eq.'+job.campaign_id))[0];if(!c||Date.now()>Date.parse(c.ends_at)){await patch('jobs',job.id,{status:'cancelled',error:'Ads paused or campaign ended'});continue;}if(!s.ads_enabled||!c.enabled){await patch('jobs',job.id,{status:'queued',run_at:new Date(Date.now()+60000).toISOString(),claimed_at:null,error:'Ads paused'});continue;}if(Date.now()<Date.parse(c.starts_at))throw Error('Campaign has not started');if(!c.poster_path||!c.template_name)throw Error('Campaign poster/image template missing');payload={type:'template',template:{name:c.template_name,language:{code:c.template_language},components:[{type:'header',parameters:[{type:'image',image:{link:await signedPoster(c.poster_path)}}]},{type:'body',parameters:[{type:'text',text:c.caption.replace(/\s+/g,' ').trim()},{type:'text',text:waLink(s.phone,c.id)}]}]}};}
 // Re-read just before outbound submission to respect recent opt-out/status changes.
 lead=(await db('leads','?id=eq.'+job.lead_id))[0];if(!canRemind(lead,await settings())){await patch('jobs',job.id,{status:'cancelled',error:'Eligibility changed before send'});continue;}
 }
 attempted=true;const response=await send(lead.phone,payload);const provider=response.messages?.[0]?.id;providerId=provider;if(!provider)throw Error('Provider did not return a message ID');
 await db('messages','',{method:'POST',body:JSON.stringify({id:provider,lead_id:lead.id,direction:'out',body:job.kind==='reply'?payload.text.body:job.kind==='reminder'?'[Reminder template]':'[Campaign template]',delivery_status:'accepted'})});
 await rpc('complete_job',{p_id:job.id,p_provider:provider});outcomes.push({id:job.id,status:'sent'});
 }catch(e){const message=e instanceof Error?e.message:'Worker error';await patch('jobs',job.id,{status:attempted?'unknown':'failed',provider_id:providerId||null,error:message.slice(0,700)});await log('job_error',{job:job.id,message:message.slice(0,700)});outcomes.push({id:job.id,status:attempted?'unknown':'failed'});}}
 return outcomes;}
