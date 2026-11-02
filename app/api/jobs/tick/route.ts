import {env,same,failure} from '@/lib/server';import {work} from '@/lib/worker';
export const runtime='nodejs';export const maxDuration=60;
export async function POST(req:Request){if(!env('CRON_SECRET')||!same(req.headers.get('authorization')||'','Bearer '+env('CRON_SECRET')))return Response.json({error:'Unauthorized'},{status:401});try{return Response.json({results:await work(8)})}catch(e){return failure(e)}}
