import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';
const duration=60*60*24*7;
export const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const secret=()=>process.env.ONCORA_SESSION_SECRET||'';
export const configured=()=>Boolean(secret().length>=32 && process.env.ONCORA_TESTER_CODES && process.env.GEMINI_API_KEY);
const digest=s=>createHash('sha256').update(s).digest('hex');
const mac=s=>createHmac('sha256',secret()).update(s).digest('hex');
function equal(a,b){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)}
const codes=()=>String(process.env.ONCORA_TESTER_CODES||'').split(',').map(s=>s.trim()).filter(s=>s.length>=16);
export function authenticateCode(code){if(!configured()||typeof code!=='string'||code.length>256)return null;const incoming=digest(code);let matched=null;for(const c of codes()){if(equal(incoming,digest(c)))matched=digest(c).slice(0,32)}return matched}
export function makeCookie(id){const exp=Math.floor(Date.now()/1000)+duration;const payload=`${id}.${exp}`;return `oncora_test=${payload}.${mac(payload)}; Path=/; Max-Age=${duration}; HttpOnly; Secure; SameSite=Strict`}
export function clearCookie(){return 'oncora_test=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'}
export function identity(req){if(!configured())return null;const cookie=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('oncora_test='));if(!cookie)return null;const parts=cookie.slice(12).split('.');if(parts.length!==3)return null;const [id,e,sig]=parts;if(!/^[a-f0-9]{32}$/.test(id)||!/^\d+$/.test(e)||Number(e)<Date.now()/1000)return null;const payload=`${id}.${e}`;if(!equal(sig,mac(payload)))return null;return codes().some(c=>equal(id,digest(c).slice(0,32)))?id:null}
export function sameOrigin(req){const origin=req.headers.get('origin');if(!origin)return false;try{return new URL(origin).origin===new URL(req.url).origin}catch{return false}}
const day=()=>new Date().toISOString().slice(0,10);
const max=5;
const store=()=>getStore({name:'oncora-test-quota',consistency:'strong'});
export async function remaining(id){const state=await store().get(`${day()}/${id}`,{type:'json'});return Math.max(0,max-(Number(state?.count)||0))}
export async function consume(id){const key=`${day()}/${id}`;const db=store();const state=await db.get(key,{type:'json'});const count=Number(state?.count)||0;if(count>=max)return -1;await db.setJSON(key,{count:count+1});return max-count-1}
