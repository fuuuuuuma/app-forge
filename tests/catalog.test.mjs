import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterIdeas,getSuggestions,restoreFavorites,swipeDecision,pullDistance} from '../lib/catalog.mjs';
const ideas=JSON.parse(await readFile(new URL('../catalog/ideas.json',import.meta.url),'utf8'));

test('検索・種類・保存・カテゴリを組み合わせても対象が一貫する',()=>{
  assert.equal(filterIdeas(ideas,{platform:'web'}).length,55);
  assert.equal(filterIdeas(ideas,{platform:'mobile'}).length,30);
  assert.equal(filterIdeas(ideas,{platform:'extension'}).length,15);
  assert.equal(filterIdeas(ideas,{query:'００６'})[0].id,'006');
  assert.equal(filterIdeas(ideas,{query:'中国語 mobile'})[0].id,'005');
  assert.equal(filterIdeas(ideas,{query:'ios',platform:'web'}).length,0);
  const favorites=new Set(['006','007','005']);
  assert.deepEqual(filterIdeas(ideas,{favoritesOnly:true,favorites,platform:'mobile'}).map(x=>x.id),['005']);
  assert.deepEqual(filterIdeas(ideas,{favoritesOnly:true,favorites,category:'動画・発信',query:'チャプター'}).map(x=>x.id),['006']);
});
test('補完候補は実在するタイトルを返し、0件・空入力を処理する',()=>{
  assert.deepEqual(getSuggestions(ideas,''),[]);assert.deepEqual(getSuggestions(ideas,'存在しない言葉'),[]);
  const suggestions=getSuggestions(ideas,'動画');assert.ok(suggestions.length>0&&suggestions.length<=6);
  assert.ok(suggestions.every(x=>ideas.includes(x)));assert.equal(getSuggestions(ideas,'中国語')[0].id,'005');
});
test('保存した一覧の破損や別のJSON形式から復帰する',()=>{
  for(const raw of ['broken','null','1','{}','"001"'])assert.equal(restoreFavorites(raw,ideas).size,0);
  assert.deepEqual([...restoreFavorites('["006","006","999",3,"005"]',ideas)],['006','005']);
});
test('スワイプは縦スクロールや短い移動と区別して開閉する',()=>{
  assert.equal(swipeDecision(-80,4),true);assert.equal(swipeDecision(-20,5),false);
  assert.equal(swipeDecision(-20,90),false);assert.equal(swipeDecision(60,3,true),false);
  assert.equal(swipeDecision(8,30,true),true);
});
test('引いて更新する操作は下向きだけで閾値を越え、過大に動かない',()=>{
  assert.equal(pullDistance(-50),0);assert.equal(pullDistance(20,80),0);
  assert.ok(pullDistance(145)>72);assert.equal(pullDistance(1000),108);
});
