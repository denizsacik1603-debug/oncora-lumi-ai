import {reply,configured,authenticateCode,makeCookie,clearCookie,identity,sameOrigin,remaining} from './_security.mjs';
export default async function handler(req){
 if(req.method==='GET'){
  const id=identity(req);let left=null;
  if(id){try{left=await remaining(id)}catch{return reply({error:'Usage store unavailable'},503)}}
  return reply({configured:configured(),authenticated:Boolean(id),remaining:left});
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(!sameOrigin(req))return reply({error:'Origin not allowed'},403);
 let data;try{const raw=await req.text();if(raw.length>1024)return reply({error:'Request too large'},413);data=JSON.parse(raw)}catch{return reply({error:'Invalid request'},400)}
 if(data.action==='logout')return reply({authenticated:false},200,{'Set-Cookie':clearCookie()});
 const id=authenticateCode(data.code);
 if(!id)return reply({error:'Invalid invitation or server not configured'},401);
 try{const left=await remaining(id);return reply({authenticated:true,remaining:left},200,{'Set-Cookie':makeCookie(id)})}catch{return reply({error:'Usage store unavailable'},503)}
}
export const config={path:'/.netlify/functions/access'};
