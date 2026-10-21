import { makeBrief, launchCommand, platformNames } from './brief.mjs';
const $ = selector => document.querySelector(selector);
const toast = message => { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 3500); };
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ideas = [], selected, category = 'すべて', favoritesOnly = false, agent = 'codex', installAgent = 'codex';
let favorites;
try { favorites = new Set(JSON.parse(localStorage.getItem('app-forge-favorites') || '[]')); } catch { favorites = new Set(); }
const saveFavorites = () => { try { localStorage.setItem('app-forge-favorites', JSON.stringify([...favorites])); } catch { toast('このブラウザでは「気になる」を保存できません。画面を開いている間だけ保持します。'); } };

async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast('コピーしました'); }
  catch { const area = document.createElement('textarea'); area.value = value; area.setAttribute('aria-label','コピーする内容'); area.style.cssText = 'position:fixed;inset:20%;width:60%;height:50%;z-index:20;background:white;color:black'; const parent = $('#idea-dialog').open ? $('#idea-dialog') : document.body; parent.append(area); area.focus(); area.select(); toast('自動コピーが使えません。選択された内容をコピーしてください。コピー後、Escで閉じます。'); area.addEventListener('keydown', e => { if(e.key === 'Escape') { e.stopPropagation(); area.remove(); } }); area.addEventListener('blur', () => area.remove(), {once:true}); }
}

function filter() {
  const query = $('#search').value.trim().toLocaleLowerCase();
  const platform = $('#platform').value;
  let visible = 0;
  for (const idea of ideas) {
    const haystack = [idea.title,idea.summary,idea.category,idea.audience,...idea.features,platformNames[idea.platform]].join(' ').toLocaleLowerCase();
    const show = (!query || haystack.includes(query)) && (platform === 'all' || platform === idea.platform) && (category === 'すべて' || category === idea.category) && (!favoritesOnly || favorites.has(idea.id));
    $(`[data-card="${idea.id}"]`).hidden = !show;
    if (show) visible++;
  }
  $('#result-count').textContent = `${visible}個のアイデア / 全100個`;
  $('#empty').hidden = visible !== 0;
  document.querySelectorAll('.category').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === category)));
  $('#favorites').setAttribute('aria-pressed', String(favoritesOnly));
}

function updateFavoriteButtons() {
  document.querySelectorAll('.save-idea').forEach(button => {
    const saved = favorites.has(button.dataset.id);
    button.setAttribute('aria-pressed', String(saved)); button.textContent = saved ? '♥' : '♡';
    button.setAttribute('aria-label', `${button.dataset.title}を気になる${saved ? 'から外す' : 'に保存'}`);
  });
}

function updateLaunch() {
  if (!selected) return;
  $('#launch-command').textContent = launchCommand(selected, agent);
  document.querySelectorAll('[data-agent]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.agent === agent)));
}

function openIdea(id, pushHash = true) {
  const idea = ideas.find(x => x.id === id);
  if (!idea) return;
  selected = idea;
  $('#detail-number').textContent = `IDEA ${idea.id} / ${platformNames[idea.platform]}`;
  $('#detail-content').innerHTML = `<p class="detail-meta">${escape(idea.category)} · ${escape(idea.level)} · 制作アイデア</p><h2 id="detail-title">${escape(idea.title)}</h2><p class="detail-summary">${escape(idea.summary)}</p><p class="detail-meta">使う人：${escape(idea.audience)}</p><div class="detail-columns"><div><h3>最初に作る3つの機能</h3><ul>${idea.features.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div><div><h3>完成の確かめ方</h3><ul>${idea.acceptance.map(x => `<li>${escape(x)}</li>`).join('')}</ul></div></div><p class="detail-caution">考えておきたいこと：${escape(idea.caution)}</p>${idea.inspiration ? `<p class="detail-source"><a href="${escape(idea.inspiration)}" target="_blank" rel="noopener">着想元を見る ↗</a>（名称や素材は独自に）</p>` : ''}`;
  updateLaunch();
  if (!$('#idea-dialog').open) $('#idea-dialog').showModal();
  $('#idea-dialog').scrollTop = 0;
  if (pushHash) history.pushState(null, '', `#idea/${id}`);
}

function fromHash() {
  const match = location.hash.match(/^#idea\/(\d{3})$/);
  if (match) openIdea(match[1], false);
  else if ($('#idea-dialog').open) $('#idea-dialog').close();
}

function setInstall(value) {
  installAgent = value;
  document.querySelectorAll('[data-install-agent]').forEach(button => { const current = button.dataset.installAgent === value; button.setAttribute('aria-selected',String(current));button.tabIndex = current ? 0 : -1; });
  $('#install-code').setAttribute('aria-labelledby', `install-${value}`);
  $('#install-command').textContent = value === 'codex' ? 'codex plugin marketplace add fuuuuuuma/app-forge\ncodex plugin add app-forge@app-forge' : 'claude plugin marketplace add fuuuuuuma/app-forge\nclaude plugin install app-forge@app-forge';
  $('#invoke').textContent = value === 'codex' ? '$app-forge' : '/app-forge:app-forge';
}

async function init() {
  try {
    const response = await fetch('./ideas.json');
    if(!response.ok) throw new Error('catalog');
    ideas = await response.json();
    const categories = ['すべて', ...new Set(ideas.map(x => x.category))];
    $('#categories').innerHTML = categories.map(x => `<button class="category" data-category="${escape(x)}" aria-pressed="${x === category}">${escape(x)}</button>`).join('');
    $('#categories').addEventListener('click', e => { const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;filter();} });
    updateFavoriteButtons(); filter(); fromHash();
  } catch { $('#result-count').textContent = '絞り込みデータを取得できませんでした。ページを再読込してください。'; }
}
$('#search').addEventListener('input',filter);
$('#platform').addEventListener('change',filter);
$('#favorites').addEventListener('click',() => {favoritesOnly=!favoritesOnly;filter();});
$('#reset').addEventListener('click',()=>{$('#search').value='';$('#platform').value='all';category='すべて';favoritesOnly=false;filter();});
$('#random').addEventListener('click',()=>{const pool=ideas.filter(x=>!$(`[data-card="${x.id}"]`).hidden);if(pool.length)openIdea(pool[Math.floor(Math.random()*pool.length)].id);else toast('絞り込みを変えてから選んでください');});
$('#idea-grid').addEventListener('click',e=>{const save=e.target.closest('.save-idea');if(save){const id=save.dataset.id;favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavorites();updateFavoriteButtons();filter();return;}const open=e.target.closest('[data-open]');if(open)openIdea(open.dataset.open);});
$('#close-dialog').addEventListener('click',()=>$('#idea-dialog').close());
$('#idea-dialog').addEventListener('close',()=>{if(location.hash.startsWith('#idea/'))history.replaceState(null,'','#ideas');});
$('#idea-dialog').addEventListener('click',e=>{if(e.target===$('#idea-dialog')){const r=$('#idea-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#idea-dialog').close();}});
document.querySelectorAll('[data-agent]').forEach(b=>b.addEventListener('click',()=>{agent=b.dataset.agent;updateLaunch();}));
document.querySelectorAll('[data-install-agent]').forEach(b=>b.addEventListener('click',()=>setInstall(b.dataset.installAgent)));
$('.tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();setInstall(e.key==='Home'?'codex':e.key==='End'?'claude':installAgent==='codex'?'claude':'codex');$(`#install-${installAgent}`).focus();}});
$('#copy-launch').addEventListener('click',()=>selected&&copy(launchCommand(selected,agent)));
$('#copy-install').addEventListener('click',()=>copy($('#install-command').textContent));
$('#copy-link').addEventListener('click',()=>copy(location.href));
$('#copy-prompt').addEventListener('click',()=>selected&&copy(`app-forge スキルを使って、次のアプリを実装・起動・動作確認まで進めてください。\n\n${makeBrief(selected)}`));
$('#download-brief').addEventListener('click',()=>{if(!selected)return;const url=URL.createObjectURL(new Blob([makeBrief(selected)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`APP_BRIEF-${selected.id}.md`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('指示書をダウンロードしました');});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!$('#idea-dialog').open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();$('#search').focus();}});
window.addEventListener('hashchange',fromHash);
init();
