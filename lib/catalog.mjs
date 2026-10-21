export const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim();
export const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function filterIdeas(ideas, {query='',platform='all',category='すべて',favoritesOnly=false,favorites=new Set()}={}) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const aliases = {web:'web webアプリ ウェブ',mobile:'mobile モバイル スマホ ios android',extension:'extension chrome 拡張 拡張機能'};
  return ideas.filter(x => (platform==='all'||x.platform===platform) && (category==='すべて'||x.category===category) && (!favoritesOnly||favorites.has(x.id)) && terms.every(term=>normalize([x.id,x.title,x.category,x.summary,x.audience,...x.features,aliases[x.platform]].join(' ')).includes(term)));
}
export function getSuggestions(ideas, query, limit=6) {
  const term=normalize(query); if(!term)return [];
  return ideas.filter(x=>normalize(x.title+' '+x.category).includes(term)).sort((a,b)=>Number(normalize(b.title).startsWith(term))-Number(normalize(a.title).startsWith(term))).slice(0,limit);
}
export function restoreFavorites(value, ideas) {
  try { const data=JSON.parse(value||'[]'); if(!Array.isArray(data))return new Set();return new Set(data.filter(x=>typeof x==='string'&&ideas.some(i=>i.id===x))); } catch{return new Set();}
}
export function swipeDecision(dx,dy,wasOpen=false) {
  if(Math.abs(dy)>Math.abs(dx))return wasOpen;
  return dx < -44 ? true : dx > 36 ? false : wasOpen;
}
export function pullDistance(dy,dx=0) {
  return dy>0&&Math.abs(dy)>Math.abs(dx)*1.25 ? Math.min(108,dy*0.52) : 0;
}
const symbols={web:'<path d="M4 7h16v12H4zM4 11h16M8 7V5h8v2"/>',mobile:'<rect x="7" y="3" width="10" height="18" rx="3"/><path d="M10 6h4m-3 12h2"/>',extension:'<path d="M8 4h4v4c4-2 5 3 1 4h-1v4H8c2 4-3 5-4 1v-1H2V8h6z"/>'};
export function cardMarkup(idea, index=0, saved=false) {
  const e=escapeHtml,labels={web:'Web',mobile:'モバイル',extension:'拡張機能'};
  return `<article class="idea-item" data-card="${idea.id}" style="--order:${index%18}"><div class="swipe-actions" aria-hidden="true"><button data-save="${idea.id}" tabindex="-1" aria-label="${e(idea.title)}を${saved?'保存から外す':'保存'}">${saved?'保存解除':'保存'}</button><button data-open="${idea.id}" tabindex="-1" aria-label="${e(idea.title)}の制作を始める">制作</button></div><div class="idea-front"><div class="card-top"><span class="app-icon icon-${idea.platform}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${symbols[idea.platform]}</svg></span><span class="card-id">${idea.id}</span><button class="save-button ${saved?'is-saved':''}" data-save="${idea.id}" aria-pressed="${saved}" aria-label="${e(idea.title)}を${saved?'保存から外す':'保存'}"><svg viewBox="0 0 24 24" fill="${saved?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6"><path d="M6 4h12v17l-6-4-6 4z"/></svg></button></div><button class="card-open" data-open="${idea.id}" aria-label="${e(idea.title)}の詳細"><h2>${e(idea.title)}</h2><p>${e(idea.summary.replace(/制作アイデア。$/,'アプリ。'))}</p></button><div class="card-bottom"><span>${labels[idea.platform]}<i>·</i>${e(idea.level)}</span><button class="swipe-toggle" data-actions="${idea.id}" aria-expanded="false" aria-label="${e(idea.title)}の操作">•••</button></div></div></article>`;
}
