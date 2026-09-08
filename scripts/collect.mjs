import { readFile,writeFile,mkdir,rename } from 'node:fs/promises';
import { collect } from './news.mjs';
import { thumbnail } from './thumbnail.mjs';
try { const env=await readFile('.env.local','utf8'); for(const line of env.replace(/^\uFEFF/,'').split(/\r?\n/)){const match=line.match(/^([A-Z_]+)=(.*)$/);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].trim();} } catch(error) {if(error.code!=='ENOENT')throw error;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function request(query,start) {
  const url=new URL('https://naverapihub.apigw.ntruss.com/search/v1/news');url.search=new URLSearchParams({query,start:String(start),display:'100',sort:'date',format:'json'});
  for(let attempt=0;attempt<3;attempt++) {
    let response;
    try {response=await fetch(url,{headers:{'X-NCP-APIGW-API-KEY-ID':process.env.NAVER_CLIENT_ID,'X-NCP-APIGW-API-KEY':process.env.NAVER_CLIENT_SECRET},signal:AbortSignal.timeout(15000),redirect:'error'});}catch {if(attempt<2){await wait(1000*(attempt+1));continue;}throw new Error('NETWORK_FAILED');}
    if((response.status===429||response.status>=500)&&attempt<2){await response.body?.cancel();await wait(1000*(attempt+1));continue;}
    if(!response.ok)throw new Error('HTTP_'+response.status);
    try{return await response.json();}catch{throw new Error('INVALID_RESPONSE');}
  }
}
try {
  if(!process.env.NAVER_CLIENT_ID||!process.env.NAVER_CLIENT_SECRET)throw new Error('MISSING_CREDENTIALS');
  const data=await collect({request});
  for(let i=0;i<data.articles.length;i+=4)await Promise.all(data.articles.slice(i,i+4).map(async article=>{article.image=await thumbnail(article.url);}));
  await mkdir('data',{recursive:true});await writeFile('data/news.json.tmp',JSON.stringify(data,null,2)+'\n');await rename('data/news.json.tmp','data/news.json');
  console.log(`Collected ${data.articles.length} articles; ${data.errors.length} collection warnings.`);
}catch(error){console.error('Collection failed:',/^(HTTP_\d+|MISSING_CREDENTIALS|ALL_REQUESTS_FAILED|NETWORK_FAILED|INVALID_RESPONSE)$/.test(error.message)?error.message:'COLLECTION_ERROR');process.exitCode=1;}

