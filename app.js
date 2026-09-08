import { topics, rankArticles, safeUrl } from './lib/preferences.js';
const $ = id => document.getElementById(id);
const key = 'nine-news-preferences-v1';
let preferences = { topics: [], hidden: [], disliked: {} }, articles = [];
try { const saved = JSON.parse(localStorage.getItem(key)); if (saved && Array.isArray(saved.topics) && Array.isArray(saved.hidden)) preferences = { topics: saved.topics.filter(t => topics.includes(t)), hidden: saved.hidden.filter(x => typeof x === 'string'), disliked: Object.fromEntries(topics.map(t => [t, Math.max(0, Math.min(5, Number(saved.disliked?.[t]) || 0))])) }; } catch {}
function save() { try { localStorage.setItem(key, JSON.stringify(preferences)); } catch { $('notice').hidden = false; $('notice').textContent = '브라우저 저장이 제한되어 관심사가 이번 방문에만 적용됩니다.'; } }
function element(tag, cls, text) { const el = document.createElement(tag); if (cls) el.className = cls; if (text) el.textContent = text; return el; }
for (const topic of topics) {
  const button = element('button', 'chip', topic); button.setAttribute('aria-pressed', preferences.topics.includes(topic));
  button.onclick = () => { preferences.topics = preferences.topics.includes(topic) ? preferences.topics.filter(t => t !== topic) : [...preferences.topics, topic]; button.setAttribute('aria-pressed', preferences.topics.includes(topic)); save(); render(); }; $('topics').append(button);
}
function card(article) {
  const root = element('article', 'card'); const link = element('a', 'card-link'); link.href = article.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  const visual = element('div', 'visual');
  const fallback = () => { visual.replaceChildren(element('span', 'placeholder', 'AI'), element('span', 'image-label', '이미지 미제공')); };
  if (article.image && safeUrl(article.image)?.startsWith('https:')) { const img = element('img'); img.src = article.image; img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.onerror = fallback; visual.append(img); } else fallback();
  const metadata = element('div', 'metadata'); metadata.append(element('span', 'category', article.category), element('span', '', article.source));
  const title = element('h2', '', article.title); link.title = article.title + ' — 원문 새 탭으로 열기';
  link.append(visual, metadata, title, element('p', 'excerpt', article.excerpt || '본문 미리보기를 제공하지 않는 기사입니다. 원문에서 확인하세요.'));
  const bottom = element('div', 'card-bottom'); const date = new Date(article.publishedAt); const time = element('time', '', date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' ↗'); time.dateTime = article.publishedAt;
  const hide = element('button', 'dismiss', '관심 없음'); hide.setAttribute('aria-label', article.title + ' 관심 없음'); hide.onclick = () => { preferences.hidden.push(article.id); preferences.hidden = preferences.hidden.slice(-500); preferences.disliked[article.category] = Math.min(5, (preferences.disliked[article.category] || 0) + 1); save(); render(); $('restore').focus(); };
  bottom.append(time, hide); root.append(link, bottom); return root;
}
function render() {
  const ranked = rankArticles(articles, preferences, $('sort').value); $('news').replaceChildren(...ranked.map(card)); $('count').textContent = `${ranked.length}개의 기사`; $('restore').hidden = !preferences.hidden.length;
  $('empty').hidden = ranked.length > 0; $('empty-title').textContent = articles.length ? '모든 기사를 숨겼어요.' : '이번 지면에 해당하는 기사가 없습니다.'; $('empty-description').textContent = articles.length ? '숨긴 기사 복원 버튼을 누르면 다시 볼 수 있어요.' : '다음 갱신 때 새로운 국내 AI 기사를 확인해 주세요.';
}
$('sort').onchange = render;
$('restore').onclick = () => { preferences.hidden = []; preferences.disliked = {}; save(); render(); };
async function load() {
  $('news').setAttribute('aria-busy', 'true'); $('retry').hidden = true;
  try {
    const response = await fetch('/data/news.json', { cache: 'no-cache' }); if (!response.ok) throw new Error('load'); const data = await response.json();
    if (!Array.isArray(data.articles)) throw new Error('shape');
    articles = data.articles.filter(a => safeUrl(a.url) && typeof a.title === 'string' && Number.isFinite(Date.parse(a.publishedAt)));
    const updated = data.generatedAt ? new Date(data.generatedAt) : null;
    $('edition-date').textContent = updated ? `${new Date(data.windowEnd).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' })} 오전 9시 지면 · 직전 24시간\n${updated.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })} 갱신` : '아직 첫 기사를 수집하지 않았습니다.';
    const stale = !updated || Date.now() - new Date(data.windowEnd).getTime() > 26 * 3600000;
    $('notice').hidden = !stale && !data.errors?.length;
    $('notice').textContent = stale ? (updated ? '최신 지면 갱신이 지연되고 있습니다. 표시된 갱신 시각을 확인해 주세요.' : '아직 첫 지면을 수집하지 못했습니다. 수집이 완료되면 기사가 표시됩니다.') : '일부 검색 결과를 수집하지 못했거나 조회 한도에 도달했습니다. 확보된 기사만 표시합니다.';
    render();
  } catch { $('count').textContent = '불러오기 실패'; $('empty').hidden = false; $('empty-title').textContent = '기사를 불러오지 못했어요.'; $('empty-description').textContent = '인터넷 연결을 확인하고 다시 시도해 주세요.'; $('retry').hidden = false; }
  finally { $('news').setAttribute('aria-busy', 'false'); }
}
$('retry').onclick = load; load();
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
setInterval(load, 15 * 60 * 1000);

