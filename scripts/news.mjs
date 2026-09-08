import { load } from 'cheerio';
import { createHash } from 'node:crypto';
export const publishers = { 'etnews.com':'전자신문', 'zdnet.co.kr':'지디넷코리아', 'aitimes.com':'AI타임스', 'aitimes.kr':'인공지능신문', 'yna.co.kr':'연합뉴스', 'yonhapnews.co.kr':'연합뉴스', 'newsis.com':'뉴시스', 'news1.kr':'뉴스1', 'hankyung.com':'한국경제', 'mk.co.kr':'매일경제', 'mt.co.kr':'머니투데이', 'edaily.co.kr':'이데일리', 'sedaily.com':'서울경제', 'chosun.com':'조선일보', 'joongang.co.kr':'중앙일보', 'donga.com':'동아일보', 'hani.co.kr':'한겨레', 'khan.co.kr':'경향신문', 'kmib.co.kr':'국민일보', 'seoul.co.kr':'서울신문', 'segye.com':'세계일보', 'dt.co.kr':'디지털타임스', 'ddaily.co.kr':'디지털데일리', 'bloter.net':'블로터', 'inews24.com':'아이뉴스24', 'kbs.co.kr':'KBS', 'imbc.com':'MBC', 'sbs.co.kr':'SBS', 'ytn.co.kr':'YTN' };
export function publisher(url) { try { const u=new URL(url); if (!['http:','https:'].includes(u.protocol) || u.username || u.password || u.port) return null; const domain=Object.keys(publishers).find(d=>u.hostname===d||u.hostname.endsWith('.'+d)); return domain ? publishers[domain] : null; } catch { return null; } }
export function clean(value='') { const $=load(String(value)); $('script,style').remove(); return $.root().text().replace(/\s+/g,' ').trim(); }
export function editionWindow(now=new Date()) { const end=new Date(now); end.setUTCHours(0,0,0,0); return { start:new Date(+end-86400000), end }; }
export function category(text) {
  if (/코딩|개발자|깃허브|github|\bAPI\b|프로그래밍|코파일럿/i.test(text)) return '개발·코딩';
  if (/논문|연구|학습법|벤치마크|학회/.test(text)) return '연구';
  if (/정책|규제|법안|저작권|윤리|정부/.test(text)) return '정책·사회';
  if (/투자|매출|인수|주가|증시|실적/.test(text)) return '산업·투자';
  return '신제품·활용법';
}
export function normalize(item, window) {
  const title=clean(item.title), excerpt=clean(item.description); const date=new Date(item.pubDate);
  const source=publisher(item.originallink)||publisher(item.link); const raw=publisher(item.originallink)?item.originallink:item.link;
  if (!source || !title || !Number.isFinite(+date) || date<window.start || date>=window.end) return null;
  if (!/인공지능|생성형|챗GPT|챗지피티|오픈AI|\b(?:AI|LLM|GPT|OpenAI|Claude|Gemini)\b/i.test(title+' '+excerpt)) return null;
  const url=new URL(raw); url.hash=''; for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  return {id:createHash('sha256').update(url.href).digest('hex').slice(0,20),title,url:url.href,source,publishedAt:date.toISOString(),category:category(title+' '+excerpt),excerpt:[...excerpt].slice(0,100).join(''),image:null};
}
export async function collect({request,now=new Date(),queries=['인공지능','생성형 AI','LLM'],maxPages=10}) {
  const window=editionWindow(now), found=new Map(), errors=[]; let successes=0;
  for(const query of queries) {
    for(let page=0;page<maxPages;page++) {
      let data;
      try { data=await request(query,page*100+1); if(!Array.isArray(data.items)) throw new Error('INVALID_RESPONSE'); successes++; }
      catch(error) { if(['HTTP_401','HTTP_403'].includes(error.message)) throw error; errors.push({query,code:error.message}); break; }
      for(const item of data.items) { const article=normalize(item,window); if(article) found.set(article.id,article); }
      const old=data.items.some(i=>Number.isFinite(Date.parse(i.pubDate))&&Date.parse(i.pubDate)<+window.start);
      if(old||data.items.length<100||page*100+data.items.length>=data.total) break;
      if(page===maxPages-1) errors.push({query,code:'SEARCH_LIMIT_REACHED'});
    }
  }
  if(!successes) throw new Error('ALL_REQUESTS_FAILED');
  return {generatedAt:now.toISOString(),windowStart:window.start.toISOString(),windowEnd:window.end.toISOString(),articles:[...found.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,60),errors};
}
