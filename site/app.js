import { makeBrief, launchCommand, platformNames } from './brief.mjs';
import { escapeHtml as e, filterIdeas, getSuggestions, restoreFavorites, cardMarkup, swipeDecision, pullDistance } from './catalog.mjs';
const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const state={ideas:[],query:'',platform:'all',category:'すべて',savedOnly:false,favorites:new Set(),limit:18,selected:null,agent:'codex',mode:'detail',suggestions:[],activeSuggestion:-1,loading:false,loaded:false};
let toastTimer,toastAction,closingTimer,returnFocus,lastSwipe=-Infinity,openedCard=null;

function toast(message,actionLabel,action){
  const box=$('#toast');clearTimeout(toastTimer);box.classList.remove('leaving');$('#toast-text').textContent=message;
  toastAction=action;$('#toast-action').hidden=!action;$('#toast-action').textContent=actionLabel||'';
  box.hidden=false;if(box.showPopover){if(!box.matches(':popover-open'))box.showPopover();}else if($('#sheet').open)$('#sheet').append(box);
  toastTimer=setTimeout(()=>{box.classList.add('leaving');setTimeout(()=>{if(box.hidePopover&&box.matches(':popover-open'))box.hidePopover();box.hidden=true;},200);},action?6500:3200);
}
$('#toast-action').addEventListener('click',()=>{const fn=toastAction;toastAction=null;if(fn)fn();});

async function copy(value){
  try{await navigator.clipboard.writeText(value);toast('コピーしました');}
  catch{const area=document.createElement('textarea');area.className='copy-fallback';area.value=value;area.setAttribute('aria-label','手動コピーする内容');const host=$('#sheet').open?$('#sheet-body'):$('.app-main');host.append(area);area.focus();area.select();toast('選択した内容を手動でコピーしてください');area.addEventListener('keydown',ev=>{if(ev.key==='Escape'){ev.stopPropagation();area.remove();}});}
}

function persistFavorites(){try{localStorage.setItem('app-forge-favorites',JSON.stringify([...state.favorites]));}catch{toast('保存できません。この画面の間だけ保持します');}}
function saveIdea(id,showUndo=true){
  const wasSaved=state.favorites.has(id);wasSaved?state.favorites.delete(id):state.favorites.add(id);persistFavorites();render(false);
  if(showUndo)toast(wasSaved?'保存から外しました':'アイデアを保存しました','取り消す',()=>{wasSaved?state.favorites.add(id):state.favorites.delete(id);persistFavorites();render(false);toast('取り消しました');});
}
function results(){return filterIdeas(state.ideas,{query:state.query,platform:state.platform,category:state.category,favoritesOnly:state.savedOnly,favorites:state.favorites});}
function render(resetPage=true){
  if(resetPage)state.limit=18;closeCardActions();const list=results();
  $('#idea-grid').innerHTML=list.slice(0,state.limit).map((idea,index)=>cardMarkup(idea,index,state.favorites.has(idea.id))).join('');
  $('#result-count').textContent=`${list.length}件${state.savedOnly?' · 保存済み':''}`;$('#empty').hidden=list.length!==0;
  $('#load-more').hidden=list.length<=state.limit;$('#load-more').textContent=`さらに表示（残り${Math.max(0,list.length-state.limit)}件）`;
  $('#clear-search').hidden=!state.query;$('#favorites').setAttribute('aria-pressed',String(state.savedOnly));$('#saved-count').textContent=state.favorites.size;
  $$('.category').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===state.category)));
  $$('[data-platform]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.platform===state.platform)));
  $('#nav-catalog').toggleAttribute('aria-current',!state.savedOnly);$('#nav-saved').toggleAttribute('aria-current',state.savedOnly);
  if(!state.savedOnly)$('#nav-catalog').setAttribute('aria-current','page');else $('#nav-saved').setAttribute('aria-current','page');
  $('.nav-dot').hidden=state.favorites.size===0;
}

async function loadIdeas(refresh=false){
  if(state.loading)return;state.loading=true;hideSuggestions();
  const overlay=$('#loading-screen');overlay.hidden=false;overlay.classList.remove('is-ready');$('.skeleton-shell').hidden=false;$('#load-error').hidden=true;
  $('#app').setAttribute('aria-busy','true');$('#app').inert=true;document.body.classList.add('refreshing');$('#refresh-button').disabled=true;
  try{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);let response;
    try{response=await fetch('./ideas.json',{cache:'no-store',signal:controller.signal});}finally{clearTimeout(timeout);}
    if(!response.ok)throw new Error('network');const ideas=await response.json();if(!Array.isArray(ideas)||ideas.length!==100||!ideas.every(x=>x.id&&x.title&&Array.isArray(x.features)))throw new Error('catalog');
    state.ideas=ideas;let raw;try{raw=localStorage.getItem('app-forge-favorites');}catch{raw=null;}state.favorites=restoreFavorites(raw,ideas);
    $('#categories').innerHTML=['すべて',...new Set(ideas.map(x=>x.category))].map(x=>`<button class="category" data-category="${e(x)}" aria-pressed="${x===state.category}">${e(x)}</button>`).join('');
    state.loaded=true;render(false);overlay.classList.add('is-ready');setTimeout(()=>{if(!state.loading)overlay.hidden=true;},290);
    if(refresh)toast('100選を更新しました');else readHash();
  }catch{
    if(state.loaded){overlay.classList.add('is-ready');setTimeout(()=>overlay.hidden=true,290);toast('更新できませんでした。前の100選を表示しています');}
    else{$('.skeleton-shell').hidden=true;$('#load-error').hidden=false;}
  }finally{
    state.loading=false;$('#refresh-button').disabled=false;$('#app').setAttribute('aria-busy','false');$('#app').inert=!state.loaded;document.body.classList.remove('refreshing','pulling');document.body.style.removeProperty('--pull-distance');
  }
}

function hideSuggestions(){state.activeSuggestion=-1;state.suggestions=[];$('#suggestions').hidden=true;$('#search').setAttribute('aria-expanded','false');$('#search').removeAttribute('aria-activedescendant');}
function suggest(){
  state.suggestions=getSuggestions(state.ideas,state.query);state.activeSuggestion=-1;
  $('#suggestions').innerHTML=state.suggestions.map((x,i)=>`<li id="suggestion-${i}" role="option" data-suggestion="${i}" aria-selected="false"><span>${e(x.title)}</span><small>${e(x.category)}</small></li>`).join('');
  const open=state.suggestions.length>0;$('#suggestions').hidden=!open;$('#search').setAttribute('aria-expanded',String(open));$('#search').removeAttribute('aria-activedescendant');
}
function chooseSuggestion(index){const idea=state.suggestions[index];if(!idea)return;state.query=idea.title;$('#search').value=idea.title;state.category='すべて';state.platform='all';state.savedOnly=false;hideSuggestions();render();$('#search').focus();}
$('#search').addEventListener('input',ev=>{state.query=ev.target.value;render();if(!ev.isComposing)suggest();});
$('#search').addEventListener('compositionend',()=>{state.query=$('#search').value;render();suggest();});
$('#search').addEventListener('focus',()=>{if(state.query)suggest();});
$('#search').addEventListener('keydown',ev=>{
  if(ev.isComposing)return;
  if(ev.key==='Escape'){hideSuggestions();return;}
  if(['ArrowDown','ArrowUp'].includes(ev.key)){
    if(!state.suggestions.length)suggest();if(!state.suggestions.length)return;ev.preventDefault();
    state.activeSuggestion=Math.max(0,Math.min(state.suggestions.length-1,state.activeSuggestion+(ev.key==='ArrowDown'?1:-1)));
    $$('#suggestions li').forEach((li,i)=>li.setAttribute('aria-selected',String(i===state.activeSuggestion)));$('#search').setAttribute('aria-activedescendant',`suggestion-${state.activeSuggestion}`);$(`#suggestion-${state.activeSuggestion}`).scrollIntoView({block:'nearest'});
  }else if(ev.key==='Enter'){if(state.activeSuggestion>=0){ev.preventDefault();chooseSuggestion(state.activeSuggestion);}else hideSuggestions();}
});
$('#suggestions').addEventListener('pointerdown',ev=>{if(ev.target.closest('[data-suggestion]'))ev.preventDefault();});
$('#suggestions').addEventListener('click',ev=>{const li=ev.target.closest('[data-suggestion]');if(li)chooseSuggestion(Number(li.dataset.suggestion));});
document.addEventListener('click',ev=>{if(!ev.target.closest('.search-area'))hideSuggestions();});
$('#clear-search').addEventListener('click',()=>{state.query='';$('#search').value='';hideSuggestions();render();$('#search').focus();});

function showSaved(value){state.savedOnly=value;hideSuggestions();render();window.scrollTo({top:0,behavior:'smooth'});}
$('#favorites').addEventListener('click',()=>showSaved(!state.savedOnly));$('#nav-saved').addEventListener('click',()=>{state.query='';state.platform='all';state.category='すべて';$('#search').value='';showSaved(true);});$('#nav-catalog').addEventListener('click',()=>showSaved(false));
$('#platforms').addEventListener('click',ev=>{const b=ev.target.closest('[data-platform]');if(b){state.platform=b.dataset.platform;hideSuggestions();render();}});
$('#categories').addEventListener('click',ev=>{const b=ev.target.closest('[data-category]');if(b){state.category=b.dataset.category;hideSuggestions();render();}});
$('#reset').addEventListener('click',()=>{Object.assign(state,{query:'',platform:'all',category:'すべて',savedOnly:false});$('#search').value='';hideSuggestions();render();});
$('#load-more').addEventListener('click',()=>{state.limit+=18;render(false);});

function closeCardActions(){if(openedCard){openedCard.classList.remove('actions-open','swiping');openedCard.querySelector('.idea-front').style.removeProperty('transform');openedCard.querySelector('.swipe-actions').setAttribute('aria-hidden','true');openedCard.querySelectorAll('.swipe-actions button').forEach(b=>b.tabIndex=-1);openedCard.querySelector('.swipe-toggle').setAttribute('aria-expanded','false');openedCard=null;}}
function setCardActions(card,open){closeCardActions();if(!open)return;card.classList.add('actions-open');card.querySelector('.swipe-actions').setAttribute('aria-hidden','false');card.querySelectorAll('.swipe-actions button').forEach(b=>b.tabIndex=0);card.querySelector('.swipe-toggle').setAttribute('aria-expanded','true');openedCard=card;}
let swipe=null;
$('#idea-grid').addEventListener('pointerdown',ev=>{if(ev.button!==0)return;const front=ev.target.closest('.idea-front');if(!front)return;swipe={front,card:front.closest('[data-card]'),x:ev.clientX,y:ev.clientY,dx:0,dy:0,open:front.closest('[data-card]').classList.contains('actions-open'),active:false,id:ev.pointerId};});
$('#idea-grid').addEventListener('pointermove',ev=>{
  if(!swipe||ev.pointerId!==swipe.id)return;swipe.dx=ev.clientX-swipe.x;swipe.dy=ev.clientY-swipe.y;
  if(!swipe.active&&Math.abs(swipe.dx)>10&&Math.abs(swipe.dx)>Math.abs(swipe.dy)*1.4){swipe.active=true;swipe.front.setPointerCapture(ev.pointerId);swipe.card.classList.add('swiping');}
  if(swipe.active){ev.preventDefault();const x=Math.max(-152,Math.min(0,(swipe.open?-142:0)+swipe.dx));swipe.front.style.transform=`translateX(${x}px)`;}
});
function endSwipe(ev){if(!swipe||ev.pointerId!==swipe.id)return;const {card,front,active,dx,dy,open}=swipe;front.style.removeProperty('transform');card.classList.remove('swiping');if(active){lastSwipe=performance.now();setCardActions(card,swipeDecision(dx,dy,open));}swipe=null;}
$('#idea-grid').addEventListener('pointerup',endSwipe);$('#idea-grid').addEventListener('pointercancel',ev=>{if(swipe){swipe.front.style.removeProperty('transform');swipe.card.classList.remove('swiping');swipe=null;}});
$('#idea-grid').addEventListener('click',ev=>{
  if(performance.now()-lastSwipe<300){ev.preventDefault();return;}
  const save=ev.target.closest('[data-save]'),open=ev.target.closest('[data-open]'),actions=ev.target.closest('[data-actions]');
  if(save)saveIdea(save.dataset.save);else if(open)openIdea(open.dataset.open);else if(actions){const card=actions.closest('[data-card]');setCardActions(card,!card.classList.contains('actions-open'));}
});
document.addEventListener('pointerdown',ev=>{if(!ev.target.closest('[data-card]'))closeCardActions();});

function installCode(){return state.agent==='codex'?'codex plugin marketplace add fuuuuuuma/app-forge\ncodex plugin add app-forge@app-forge':'claude plugin marketplace add fuuuuuuma/app-forge\nclaude plugin install app-forge@app-forge';}
function agentOptions(){return `<div class="agent-options" role="group" aria-label="使用するAI"><button data-agent="codex" aria-pressed="${state.agent==='codex'}">Codex</button><button data-agent="claude" aria-pressed="${state.agent==='claude'}">Claude Code</button></div>`;}
function codeBlock(value,action,label='コピー'){return `<div class="code-block"><pre><code>${e(value)}</code></pre><button class="copy-code" data-copy="${action}">${label}</button></div>`;}
function prerequisiteMarkup(){return `<ul class="prerequisites"><li>${icon('check')}<a href="https://nodejs.org/en/download" target="_blank" rel="noopener">Node.js 20以上・npm</a> と <a href="https://git-scm.com/downloads" target="_blank" rel="noopener">Git</a></li><li>${icon('check')}<a href="${state.agent==='codex'?'https://developers.openai.com/codex/cli/':'https://code.claude.com/docs/en/overview'}" target="_blank" rel="noopener">${state.agent==='codex'?'Codex':'Claude Code'} CLIの導入・ログイン</a></li></ul>`;}
function installMarkup(forIdea=false){
  const invoke=state.agent==='codex'?'$app-forge':'/app-forge:app-forge';
  return `${agentOptions()}<h3>1. 開発環境</h3>${prerequisiteMarkup()}<h3>2. スキルを導入</h3>${codeBlock(installCode(),'install','2行をコピー')}<p class="info-note">ターミナルで実行します。2行はスキルの導入用です。${state.agent==='codex'?'Codex':'Claude Code'}本体とログインは先に必要です。</p><div class="install-next"><h3>3. ${forIdea?'選んだアプリを作る':'開発を始める'}</h3>${forIdea?codeBlock(launchCommand(state.selected,state.agent),'launch','起動コマンドをコピー'):`<p class="sheet-description">新しいチャットで <code>${invoke}</code> と作りたいアプリ、または100選のIDを伝えてください。</p>${codeBlock(`${invoke} を使って、100選の006をローカルで動くアプリにしてください。実装・起動・動作確認まで進めてください。`,'example','チャット用の指示をコピー')}`}</div>${forIdea?`<p class="info-note">新しい作業フォルダに指示書とスキルを用意し、AIを起動します。既存ファイルを上書きしません。</p><div class="sheet-tools"><button data-tool="download">指示書を保存 ↓</button><button data-copy="prompt">チャットで始める</button></div>`:''}<p class="info-note">AIの利用料は本人のプランに従います。公開・課金・ストア提出は許可された範囲で進めます。</p>`;
}

function openSheet(mode){
  state.mode=mode;hideSuggestions();closeCardActions();clearTimeout(closingTimer);const dialog=$('#sheet');dialog.classList.remove('closing');dialog.style.removeProperty('transform');
  if(!dialog.open){returnFocus=document.activeElement;dialog.showModal();}renderSheet();dialog.scrollTop=0;
}
function openIdea(id,push=true){const idea=state.ideas.find(x=>x.id===id);if(!idea)return;state.selected=idea;openSheet('detail');if(push)history.pushState(null,'',`#idea/${id}`);}
function closeSheet(){const dialog=$('#sheet');if(!dialog.open)return;dialog.classList.add('closing');closingTimer=setTimeout(()=>{dialog.close();dialog.classList.remove('closing');dialog.style.removeProperty('transform');},230);}
function renderSheet(){
  const idea=state.selected,mode=state.mode;
  if(mode==='detail'&&idea){
    $('#sheet-label').textContent=`${idea.id} / ${platformNames[idea.platform]}`;
    $('#sheet-body').innerHTML=`<p class="sheet-meta">${e(idea.category)} · ${e(idea.level)}</p><h2 id="sheet-title">${e(idea.title)}</h2><p class="sheet-description">${e(idea.summary.replace(/制作アイデア。$/,'アプリ。'))}</p><div class="sheet-columns"><section><h3>最初に作る機能</h3><ul class="feature-list">${idea.features.map(x=>`<li>${e(x)}</li>`).join('')}</ul></section><section><h3>完成の確かめ方</h3><ul class="feature-list">${idea.acceptance.map(x=>`<li>${e(x)}</li>`).join('')}</ul></section></div><p class="caution">${e(idea.caution)}</p>${idea.inspiration?`<a class="source-link" href="${e(idea.inspiration)}" target="_blank" rel="noopener">着想元 ↗</a>`:''}<div class="sheet-tools"><button data-tool="share">リンクをコピー</button><button data-tool="download">指示書を保存 ↓</button></div>`;
    $('#sheet-footer').innerHTML=`<button class="secondary" data-tool="save-selected" aria-label="${state.favorites.has(idea.id)?'保存から外す':'このアイデアを保存'}">${icon('bookmark')}</button><button class="primary" data-tool="start">このアプリを作る ${icon('arrow')}</button>`;
  }else if(mode==='start'&&idea){
    $('#sheet-label').textContent=`制作 / ${idea.id}`;$('#sheet-body').innerHTML=`<button class="back-button" data-tool="back">${icon('arrow')}詳細へ戻る</button><p class="sheet-meta">${platformNames[idea.platform]}</p><h2 id="sheet-title">${e(idea.title)}</h2>${installMarkup(true)}`;$('#sheet-footer').innerHTML=`<button class="primary" data-copy="launch">起動コマンドをコピー ${icon('code')}</button>`;
  }else if(mode==='install'){
    $('#sheet-label').textContent='セットアップ';$('#sheet-body').innerHTML=`<h2 id="sheet-title">スキル導入</h2>${installMarkup()}`;$('#sheet-footer').innerHTML=`<button class="primary" data-copy="install">2行をコピー ${icon('code')}</button>`;
  }else{
    $('#sheet-label').textContent='リリース';$('#sheet-body').innerHTML=`<h2 id="sheet-title">公開手順</h2><div class="release-options"><a href="https://github.com/fuuuuuuma/app-forge/blob/main/plugins/app-forge/skills/app-forge/references/platforms.md" target="_blank" rel="noopener"><strong>Web / Sites / Cloudflare ↗</strong><span>URLで公開。認証・保存先・費用を確認。</span></a><a href="https://github.com/fuuuuuuma/app-forge/blob/main/plugins/app-forge/skills/app-forge/references/store-release.md" target="_blank" rel="noopener"><strong>App Store / Google Play ↗</strong><span>実機検証、署名ビルド、テスト配信、審査提出。</span></a><a href="https://developer.chrome.com/docs/webstore/publish" target="_blank" rel="noopener"><strong>Chrome Web Store ↗</strong><span>権限・ZIP・掲載情報を確認して審査へ。</span></a><a href="https://developers.openai.com/codex/app-server/" target="_blank" rel="noopener"><strong>Codex App Server ↗</strong><span>自作アプリからCodexを動かす場合の接続手段。</span></a></div><p class="info-note">本人確認・契約・開発者登録は本人が行います。ストアとクラウドの費用は別途。提出と一般公開を区別します。</p>`;$('#sheet-footer').innerHTML='';
  }
}

$('#sheet').addEventListener('click',ev=>{
  const tool=ev.target.closest('[data-tool]')?.dataset.tool,copyAction=ev.target.closest('[data-copy]')?.dataset.copy,agent=ev.target.closest('[data-agent]')?.dataset.agent;
  if(agent){state.agent=agent;renderSheet();return;}
  if(copyAction){
    const values={install:()=>installCode(),launch:()=>launchCommand(state.selected,state.agent),example:()=>`${state.agent==='codex'?'$app-forge':'/app-forge:app-forge'} を使って、100選の006をローカルで動くアプリにしてください。実装・起動・動作確認まで進めてください。`,prompt:()=>`${state.agent==='codex'?'$app-forge':'/app-forge:app-forge'} を使って次のアプリを実装・起動・動作確認まで進めてください。\n\n${makeBrief(state.selected)}`};if(values[copyAction])copy(values[copyAction]());return;
  }
  if(tool==='start'){state.mode='start';renderSheet();$('#sheet').scrollTop=0;}
  if(tool==='back'){state.mode='detail';renderSheet();$('#sheet').scrollTop=0;}
  if(tool==='save-selected'){saveIdea(state.selected.id);renderSheet();}
  if(tool==='share')copy(new URL(`#idea/${state.selected.id}`,location.href).href);
  if(tool==='download'){
    const url=URL.createObjectURL(new Blob([makeBrief(state.selected)],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`APP_BRIEF-${state.selected.id}.md`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('指示書を保存しました');
  }
  if(ev.target===$('#sheet')){const rect=$('#sheet').getBoundingClientRect();if(ev.clientX<rect.left||ev.clientX>rect.right||ev.clientY<rect.top||ev.clientY>rect.bottom)closeSheet();}
});
$$('[data-show]').forEach(b=>b.addEventListener('click',()=>{openSheet(b.dataset.show);history.pushState(null,'',`#${b.dataset.show}`);}));
$('#close-sheet').addEventListener('click',closeSheet);$('#sheet').addEventListener('cancel',ev=>{ev.preventDefault();closeSheet();});
$('#sheet').addEventListener('close',()=>{if(/^#(idea\/|install|release)/.test(location.hash))history.replaceState(null,'',location.pathname+location.search);if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
function readHash(){if(!state.loaded)return;const match=location.hash.match(/^#idea\/(\d{3})$/);if(match){if(state.ideas.some(x=>x.id===match[1]))openIdea(match[1],false);else toast('このIDは見つかりません');}else if(['#install','#release'].includes(location.hash))openSheet(location.hash.slice(1));else if($('#sheet').open)closeSheet();}
window.addEventListener('hashchange',readHash);
let handleDrag=null,suppressHandleClick=false;
$('#sheet-handle').addEventListener('pointerdown',ev=>{handleDrag={y:ev.clientY,dy:0,id:ev.pointerId};ev.currentTarget.setPointerCapture(ev.pointerId);});
$('#sheet-handle').addEventListener('pointermove',ev=>{if(!handleDrag||ev.pointerId!==handleDrag.id)return;handleDrag.dy=Math.max(0,ev.clientY-handleDrag.y);$('#sheet').style.transform=`translateY(${handleDrag.dy}px)`;});
function endHandle(){if(!handleDrag)return;suppressHandleClick=handleDrag.dy>8;if(handleDrag.dy>65)closeSheet();else $('#sheet').style.removeProperty('transform');handleDrag=null;}
$('#sheet-handle').addEventListener('pointerup',endHandle);$('#sheet-handle').addEventListener('pointercancel',endHandle);$('#sheet-handle').addEventListener('click',()=>{if(!suppressHandleClick)closeSheet();suppressHandleClick=false;});

let pull=null;
function beginPull(x,y,target){if(scrollY>1||$('#sheet').open||state.loading||target.closest('button,input,a,[data-card],.categories'))return;pull={x,y,distance:0};}
function movePull(x,y,ev){if(!pull)return;const distance=pullDistance(y-pull.y,x-pull.x);if(distance<5)return;ev.preventDefault();pull.distance=distance;document.body.classList.add('pulling');document.body.style.setProperty('--pull-distance',distance+'px');$('#pull-status').style.transform=`translate(-50%,${distance/2}px)`;$('#pull-status span').textContent=distance>=72?'離して更新':'下に引いて更新';}
function endPull(){if(!pull)return;const distance=pull.distance;pull=null;document.body.classList.remove('pulling');document.body.style.removeProperty('--pull-distance');$('#pull-status').style.removeProperty('transform');if(distance>=72)loadIdeas(true);}
document.addEventListener('touchstart',ev=>{if(ev.touches.length===1)beginPull(ev.touches[0].clientX,ev.touches[0].clientY,ev.target);},{passive:true});
document.addEventListener('touchmove',ev=>{if(ev.touches.length===1)movePull(ev.touches[0].clientX,ev.touches[0].clientY,ev);},{passive:false});
document.addEventListener('touchend',endPull,{passive:true});document.addEventListener('touchcancel',()=>{pull=null;document.body.classList.remove('pulling');document.body.style.removeProperty('--pull-distance');},{passive:true});
$('#pull-zone').addEventListener('pointerdown',ev=>{if(ev.pointerType==='touch')return;beginPull(ev.clientX,ev.clientY,ev.target);ev.currentTarget.setPointerCapture(ev.pointerId);});
$('#pull-zone').addEventListener('pointermove',ev=>{if(ev.pointerType!=='touch')movePull(ev.clientX,ev.clientY,ev);});$('#pull-zone').addEventListener('pointerup',endPull);$('#pull-zone').addEventListener('pointercancel',endPull);
$('#refresh-button').addEventListener('click',()=>loadIdeas(true));$('#retry-load').addEventListener('click',()=>loadIdeas());
document.addEventListener('keydown',ev=>{if(ev.key==='/'&&!$('#sheet').open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){ev.preventDefault();$('#search').focus();}if(ev.key==='Escape')closeCardActions();});
loadIdeas();
