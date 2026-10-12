export { topics } from './categories.js';
export function rankArticles(articles, preferences, mode = 'personal') {
  return articles.filter(a => !preferences.hidden.includes(a.id)).sort((a, b) => {
    const score = x => (preferences.topics.includes(x.category) ? 10 : 0) - (preferences.disliked[x.category] || 0);
    return (mode === 'personal' ? score(b) - score(a) : 0) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
}
export function safeUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; } catch { return null; } }

