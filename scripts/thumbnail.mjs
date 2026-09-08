import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { load } from 'cheerio';
import { publisher } from './news.mjs';
export function publicIPv4(ip) { const p=ip.split('.').map(Number); return p.length===4&&p.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&![0,10,127].includes(p[0])&&p[0]<224&&!(p[0]===169&&p[1]===254)&&!(p[0]===172&&p[1]>=16&&p[1]<=31)&&!(p[0]===192&&(p[1]===168||p[1]===0))&&!(p[0]===100&&p[1]>=64&&p[1]<=127)&&!(p[0]===198&&[18,19,51].includes(p[1]))&&!(p[0]===203&&p[1]===0); }
async function html(url) {
  const u=new URL(url); if(u.protocol!=='https:'||!publisher(url)) throw new Error('HOST');
  const addresses=await lookup(u.hostname,{family:4,all:true}); if(!addresses.length||addresses.some(a=>!publicIPv4(a.address))) throw new Error('IP');
  return new Promise((resolve,reject)=>{
    const req=https.get(u,{lookup:(_hostname,_options,cb)=>cb(null,addresses[0].address,4),headers:{'User-Agent':'NineNewsstand/1.0 (article preview)','Accept':'text/html'}},res=>{
      if(res.statusCode!==200||!String(res.headers['content-type']).includes('text/html')) { res.resume(); reject(new Error('RESPONSE')); return; }
      let size=0;const chunks=[];res.on('data',chunk=>{size+=chunk.length;if(size>1024*1024)req.destroy(new Error('SIZE'));else chunks.push(chunk);});res.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));res.on('error',reject);
    }); const timer=setTimeout(()=>req.destroy(new Error('TIMEOUT')),5000); req.on('close',()=>clearTimeout(timer)); req.on('error',reject);
  });
}
export async function thumbnail(url) { try { const $=load(await html(url)); const raw=$('meta[property="og:image"]').attr('content'); if(!raw)return null;const image=new URL(raw,url); if(image.protocol!=='https:'||image.username||image.password||image.port)return null; const addresses=await lookup(image.hostname,{family:4,all:true});return addresses.length&&addresses.every(a=>publicIPv4(a.address))?image.href:null; } catch { return null; } }
