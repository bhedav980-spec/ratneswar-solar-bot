export function normalizePhone(value){let s=String(value??'').trim().replace(/[\s()+.-]/g,'');if(s.startsWith('00'))s=s.slice(2);if(/^\d{10}$/.test(s))s='91'+s;if(!/^[1-9]\d{7,14}$/.test(s))throw Error('Invalid international phone number');return s;}
export function isStop(text){return /^(stop|unsubscribe|cancel|બંધ|બંધ કરો|બંધ કરો\.|બંદ|રોકો|बंद|बंद करो)$/iu.test(String(text).trim());}
export function canRemind(lead,settings){return !!settings.chat_enabled&&!!lead.marketing_consent&&!lead.opted_out&&lead.status==='pending';}
export function inWindow(lead,now=Date.now()){return !!lead.last_inbound_at&&now-new Date(lead.last_inbound_at).getTime()<24*60*60*1000;}
export function waLink(phone,campaign=''){return 'https://wa.me/'+normalizePhone(phone)+'?text='+encodeURIComponent('નમસ્તે, મને સોલાર વિશે માહિતી જોઈએ છે.'+(campaign?' [Campaign: '+campaign+']':''));}
export function validateSource(value){const u=new URL(value);if(!['http:','https:'].includes(u.protocol))throw Error('Only HTTP/HTTPS links are allowed');return u.href;}
export function nextReply(lead,text,settings){const t=String(text).trim().slice(0,2000);const patch={};let reply='';if(isStop(t))return {patch:{opted_out:true,marketing_consent:false,status:'no'},reply:'તમારા પ્રમોશનલ મેસેજ અને રિમાઇન્ડર બંધ કરવામાં આવ્યા છે. મદદ માટે 8128399432 પર સંપર્ક કરો.'};
if(!lead.name||lead.stage==='name'){patch.name=t.slice(0,120);patch.stage='address';reply='આભાર. તમારું ગામ/શહેર અને સંપૂર્ણ સરનામું જણાવશો?';}
else if(lead.stage==='address'){patch.address=t.slice(0,500);patch.stage='bill';reply='તમારું અંદાજિત માસિક લાઇટ બિલ કેટલું આવે છે?';}
else if(lead.stage==='bill'){patch.bill=t.slice(0,100);patch.stage='consent';reply='શું Ratneswar Solar Solutions તરફથી સોલાર ઓફર અને દર 3 દિવસે રિમાઇન્ડર મેળવવા માંગો છો? YES અથવા NO લખો. STOP લખીને ક્યારેય પણ બંધ કરી શકો છો.';}
else if(lead.stage==='consent'){if(/^(yes|હા|હાં|haan|ha)$/iu.test(t)){patch.marketing_consent=true;patch.consent_source='WhatsApp explicit YES to 3-day reminder question';patch.consent_at=new Date().toISOString();patch.opted_out=false;patch.stage='ready';patch.next_reminder_at=new Date(Date.now()+3*86400000).toISOString();reply=settings.welcome_text;}else if(/^(no|ના|nahi|na)$/iu.test(t)){patch.marketing_consent=false;patch.stage='ready';reply='બરાબર, પ્રમોશનલ રિમાઇન્ડર નહીં મોકલીએ. સોલારની માહિતી માટે તમારો પ્રશ્ન પૂછો.';}else reply='રિમાઇન્ડર માટે YES અથવા NO લખશો.';}
else if(/subsidy|સબસિડી|scheme|યોજના/iu.test(t))reply=settings.scheme_text;
else if(/price|cost|કિંમત|ભાવ|કેટલા|કેટલો/iu.test(t))reply=settings.price_text;
else reply=settings.welcome_text;
return {patch,reply};}
