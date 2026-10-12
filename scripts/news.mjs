import { topics, companies, companyBasis } from '../lib/categories.js';
import { load } from 'cheerio';
import { createHash } from 'node:crypto';
export const publishers = { 'etnews.com':'전자신문', 'zdnet.co.kr':'지디넷코리아', 'aitimes.com':'AI타임스', 'aitimes.kr':'인공지능신문', 'yna.co.kr':'연합뉴스', 'yonhapnews.co.kr':'연합뉴스', 'newsis.com':'뉴시스', 'news1.kr':'뉴스1', 'hankyung.com':'한국경제', 'mk.co.kr':'매일경제', 'mt.co.kr':'머니투데이', 'edaily.co.kr':'이데일리', 'sedaily.com':'서울경제', 'chosun.com':'조선일보', 'joongang.co.kr':'중앙일보', 'donga.com':'동아일보', 'hani.co.kr':'한겨레', 'khan.co.kr':'경향신문', 'kmib.co.kr':'국민일보', 'seoul.co.kr':'서울신문', 'segye.com':'세계일보', 'dt.co.kr':'디지털타임스', 'ddaily.co.kr':'디지털데일리', 'bloter.net':'블로터', 'inews24.com':'아이뉴스24', 'kbs.co.kr':'KBS', 'imbc.com':'MBC', 'sbs.co.kr':'SBS', 'ytn.co.kr':'YTN' };
export function publisher(url) { try { const u=new URL(url); if (!['http:','https:'].includes(u.protocol) || u.username || u.password || u.port) return null; const domain=Object.keys(publishers).find(d=>u.hostname===d||u.hostname.endsWith('.'+d)); return domain ? publishers[domain] : null; } catch { return null; } }
export function clean(value='') { const $=load(String(value)); $('script,style').remove(); return $.root().text().replace(/\s+/g,' ').trim(); }
export function editionWindow(now=new Date()) { const end=new Date(now); end.setUTCHours(0,0,0,0); return { start:new Date(+end-86400000), end }; }
const ai=/인공지능|생성형|챗GPT|챗지피티|오픈AI|\b(?:AI|LLM|GPT|OpenAI|Claude|Gemini)\b/i;
const auto=/자동차|전기차|자율주행|완성차|수소차|하이브리드|현대차|기아|테슬라|토요타|도요타|폭스바겐|벤츠|BMW|BYD/i;
const domestic=/갤럭시|삼성|\bSK\b|SK하이닉스|SK텔레콤|SK이노베이션|현대자동차|현대차|기아|\bLG\b|LG전자|LG에너지솔루션|LG화학|한화|롯데|포스코|POSCO|HD현대|농협|\bGS\b|GS칼텍스|GS리테일|GS건설/i;
const globalCompany=/엔비디아|NVIDIA|애플|Apple|알파벳|구글|Google|마이크로소프트|Microsoft|아마존|Amazon|TSMC|대만반도체|스페이스X|스페이스엑스|SpaceX|메타|Meta|브로드컴|Broadcom|아람코|Aramco/i;
export function category(text) {
  text=text.replace(/\[[^\]]*\]|【[^】]*】/g,' ');
  if(ai.test(text))return topics[0];
  if(auto.test(text))return topics[1];
  if(domestic.test(text))return topics[2];
  if(globalCompany.test(text))return topics[3];
  return null;
}
export function normalize(item, window) {
  const title=clean(item.title), excerpt=clean(item.description),date=new Date(item.pubDate);
  const source=publisher(item.originallink)||publisher(item.link),raw=publisher(item.originallink)?item.originallink:item.link;
  if(!source||!title||!Number.isFinite(+date)||date<window.start||date>=window.end)return null;
  // Require a headline topic to avoid incidental company mentions in sports or general news.
  const group=category(title); if(!group)return null;
  const url=new URL(raw);url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))url.searchParams.delete(key);
  return {id:createHash('sha256').update(url.href).digest('hex').slice(0,20),title,url:url.href,source,publishedAt:date.toISOString(),category:group,excerpt:[...excerpt].slice(0,100).join(''),image:null};
}
function canonical(text) {
  return text.toLowerCase().replace(/\[[^\]]*\]|【[^】]*】/g,' ').replace(/인공지능/g,'ai').replace(/현대자동차/g,'현대차').replace(/마이크로소프트/g,'ms').replace(/엔비디아/g,'nvidia').replace(/알파벳/g,'구글').replace(/스페이스엑스/g,'스페이스x').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\b(단독|속보|종합|포토|영상|오늘|발표|밝혔다)\b/g,' ').trim();
}
function grams(text) {const compact=canonical(text).replace(/\s/g,'');return new Set(Array.from({length:Math.max(0,compact.length-2)},(_,i)=>compact.slice(i,i+3)));}
function dice(a,b){if(!a.size||!b.size)return 0;let hits=0;for(const t of a)if(b.has(t))hits++;return 2*hits/(a.size+b.size);}
export function sameStory(a,b) {
  if(a.id===b.id||a.url===b.url)return true;
  const x=canonical(a.title),y=canonical(b.title);if(x===y)return true;
  const titleScore=dice(grams(x),grams(y));
  // Avoid combining different product model numbers / amounts just because wording matches.
  const nums=t=>(t.match(/\d+(?:\.\d+)?/g)||[]).sort().join(',');
  if(nums(x)&&nums(y)&&nums(x)!==nums(y))return false;
  const fullA=canonical(a.title+' '+(a.excerpt||'')),fullB=canonical(b.title+' '+(b.excerpt||''));
  const sameCompany=[...companies.domestic,...companies.global,'구글','현대차'].some(name=>fullA.includes(canonical(name))&&fullB.includes(canonical(name)));
  const quotes=[...(a.title+' '+(a.excerpt||'')+' '+b.title+' '+(b.excerpt||'')).matchAll(/[‘“"']([\p{L}\p{N}]{2,20})[’”"']/gu)].map(m=>canonical(m[1]));
  const namedProduct=quotes.some(term=>!['신제품','새로운','출시','공개','인공지능','ai'].includes(term)&&fullA.includes(term)&&fullB.includes(term));
  const launch=/출시|공개|선보|발표/;
  if(sameCompany&&namedProduct&&launch.test(fullA)&&launch.test(fullB))return true;
  const passage=dice(grams(a.excerpt||''),grams(b.excerpt||''));
  return titleScore>=0.67||(titleScore>=0.38&&passage>=0.72);
}
export function selectArticles(candidates,limit=5) {
  const selected=[],counts=Object.fromEntries(topics.map(t=>[t,0]));
  const ordered=[...candidates].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
  for(const article of ordered){if(!Object.hasOwn(counts,article.category)||counts[article.category]>=limit||selected.some(prior=>sameStory(prior,article)))continue;selected.push(article);counts[article.category]++;}
  return selected;
}
export const searchQueries=['인공지능','생성형 AI','자동차','전기차',...companies.domestic,...companies.global,'구글'];
export async function collect({request,now=new Date(),queries=searchQueries,maxPages=3}) {
  const window=editionWindow(now),found=new Map(),errors=[];let successes=0;
  for(const query of queries){for(let page=0;page<maxPages;page++){
    let data;try{data=await request(query,page*100+1);if(!Array.isArray(data.items))throw new Error('INVALID_RESPONSE');successes++;}
    catch(error){if(['HTTP_401','HTTP_403'].includes(error.message))throw error;errors.push({query,code:error.message});break;}
    for(const item of data.items){const article=normalize(item,window);if(article)found.set(article.id,article);}
    const old=data.items.some(i=>Number.isFinite(Date.parse(i.pubDate))&&Date.parse(i.pubDate)<+window.start);
    if(old||data.items.length<100||page*100+data.items.length>=data.total)break;
    if(page===maxPages-1)errors.push({query,code:'SEARCH_LIMIT_REACHED'});
  }}
  if(!successes)throw new Error('ALL_REQUESTS_FAILED');
  const articles=selectArticles([...found.values()]);
  return {generatedAt:now.toISOString(),windowStart:window.start.toISOString(),windowEnd:window.end.toISOString(),schemaVersion:2,companyBasis,companies,categoryCounts:Object.fromEntries(topics.map(t=>[t,articles.filter(a=>a.category===t).length])),articles,errors};
}


