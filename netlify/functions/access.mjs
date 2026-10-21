import {reply,configured,guestConfigured,authenticateCode,makeCookie,clearCookie,identity,isGuestId,createGuestCookie,sameOrigin,quota} from './_security.mjs';
export default async function handler(req){
 if(req.method==='GET'){
  const id=identity(req);let left=null,resetAt=null;
  if(id){try{({remaining:left,resetAt}=await quota(id))}catch{return reply({error:'Usage store unavailable'},503)}}
  return reply({configured:configured()||guestConfigured(),guestEnabled:guestConfigured(),authenticated:Boolean(id),mode:id?(isGuestId(id)?'guest':'tester'):null,remaining:left,resetAt,limit:3});
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!sameOrigin(req))return reply({error:'Origin not allowed'},403);
 let data;try{const raw=await req.text();if(raw.length>1024)return reply({error:'Request too large'},413);data=JSON.parse(raw)}catch{return reply({error:'Invalid request'},400)}
 if(data.action==='logout')return reply({authenticated:false},200,{'Set-Cookie':clearCookie()});
 if(data.action==='guest'){
  if(!guestConfigured())return reply({error:'Guest access is disabled',code:'GUEST_DISABLED'},403);
  const existing=identity(req);
  if(existing){const status=await quota(existing);return reply({configured:true,guestEnabled:true,authenticated:true,mode:isGuestId(existing)?'guest':'tester',...status})}
  const guest=createGuestCookie();
  try{const status=await quota(guest.id);return reply({configured:true,guestEnabled:true,authenticated:true,mode:'guest',...status},200,{'Set-Cookie':guest.cookie})}
  catch{return reply({error:'Usage store unavailable'},503)}
 }
 const id=authenticateCode(data.code);
 if(!id)return reply({error:'Invalid invitation or server not configured'},401);
 try{const status=await quota(id);return reply({configured:true,guestEnabled:guestConfigured(),authenticated:true,mode:'tester',...status},200,{'Set-Cookie':makeCookie(id)})}
 catch{return reply({error:'Usage store unavailable'},503)}
}
export const config={path:'/.netlify/functions/access'};
