import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, chmod, access, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { findIdea, makeBrief, launchCommand } from '../lib/brief.mjs';
const root = fileURLToPath(new URL('../',import.meta.url));
const cli = path.join(root,'scripts/start.mjs');
const ideas = JSON.parse(await readFile(path.join(root,'catalog/ideas.json'),'utf8'));
const run = (args,options={}) => spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',...options});

test('100件が一意で、すべてに機能・データ・合格条件がある',()=>{
  assert.equal(ideas.length,100); assert.equal(new Set(ideas.map(x=>x.slug)).size,100);assert.equal(new Set(ideas.map(x=>x.title)).size,100);
  ideas.forEach((x,index)=>{assert.equal(x.id,String(index+1).padStart(3,'0'));assert.match(x.slug,/^[a-z][a-z0-9-]+$/);assert.ok(['web','mobile','extension'].includes(x.platform));for(const key of ['title','category','level','summary','audience','caution'])assert.ok(x[key]?.length>0);assert.equal(x.features.length,3);assert.equal(x.acceptance.length,3);assert.ok(x.data.length>0);});
});
test('全件の指示書と起動コマンドが対象のIDを引き継ぐ',()=>{
  for(const x of ideas){assert.equal(findIdea(ideas,x.id),x);assert.equal(findIdea(ideas,x.slug),x);const brief=makeBrief(x);for(const feature of [...x.features,...x.acceptance])assert.ok(brief.includes(feature));assert.ok(launchCommand(x,'codex').includes(`start ${x.id} --agent codex`));assert.ok(launchCommand(x,'claude').includes(`start ${x.id} --agent claude`));}
});
test('不明なID・agent・引数でファイルを作らない',async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'app-forge-invalid-'));const out=path.join(base,'must-not-exist');
  for(const args of [['start','999'],['start','004','--agent','unknown'],['start','004','--out'],['start','004','--execute-everything']])assert.notEqual(run([...args,'--out',out]).status,0);
  await assert.rejects(access(out));
});
test('dry-run は書き込まず指示だけを表示する',async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'app-forge-dry-'));const out=path.join(base,'new');const result=run(['start','004','--dry-run','--out',out]);assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).destination,out);await assert.rejects(access(out));
});
test('prepare-only で独立した指示書・スキルを生成し、再実行で既存を守る',async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'app-forge-prepare-'));const out=path.join(base,'新しい アプリ');const result=run(['start','004','--prepare-only','--out',out]);assert.equal(result.status,0,result.stderr);
  assert.ok((await readFile(path.join(out,'APP_BRIEF.md'),'utf8')).includes('サブスクの更新カレンダー'));
  for(const folder of ['.agents','.claude'])await access(path.join(out,folder,'skills/app-forge/references/store-release.md'));
  const lookup=spawnSync(process.execPath,[path.join(out,'.agents/skills/app-forge/scripts/idea.mjs'),'100'],{encoding:'utf8'});assert.equal(lookup.status,0,lookup.stderr);assert.equal(JSON.parse(lookup.stdout).id,'100');
  await writeFile(path.join(out,'APP_BRIEF.md'),'USER EDIT');assert.notEqual(run(['start','004','--prepare-only','--out',out]).status,0);assert.equal(await readFile(path.join(out,'APP_BRIEF.md'),'utf8'),'USER EDIT');
});
test('CodexとClaudeの起動へcwdと指示を渡し、承認回避引数を付けない',async()=>{
  if(process.platform==='win32')return;
  const base=await mkdtemp(path.join(tmpdir(),'app-forge-launch-'));const bin=path.join(base,'bin');await mkdir(bin);
  for(const agent of ['codex','claude']){
    const fake=path.join(bin,agent);const log=path.join(base,agent+'.json');const out=path.join(base,agent+' & $new');
    await writeFile(fake,`#!${process.execPath}\nimport fs from 'node:fs';\nif(process.argv[2]==='--version')process.exit(0);\nfs.writeFileSync(process.env.APP_FORGE_TEST_LOG,JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));\n`);await chmod(fake,0o755);
    const r=run(['start','007','--agent',agent,'--out',out],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,APP_FORGE_TEST_LOG:log}});assert.equal(r.status,0,r.stderr);const got=JSON.parse(await readFile(log,'utf8'));assert.equal(got.cwd,await realpath(out));assert.equal(got.args.length,1);assert.ok(got.args[0].includes('APP_BRIEF.md'));assert.ok(!got.args[0].includes('dangerously'));
  }
});
test('AI起動失敗時には未実装の資料を残し、失敗を伝える',async()=>{
  if(process.platform==='win32')return;
  const base=await mkdtemp(path.join(tmpdir(),'app-forge-fail-'));const bin=path.join(base,'bin');await mkdir(bin);const fake=path.join(bin,'codex');const out=path.join(base,'app');await writeFile(fake,`#!${process.execPath}\nprocess.exit(process.argv[2]==='--version'?0:7);\n`);await chmod(fake,0o755);const r=run(['start','008','--out',out],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});assert.equal(r.status,7);await access(path.join(out,'APP_STATUS.md'));assert.equal(await readFile(path.join(out,'APP_BRIEF.md'),'utf8'),makeBrief(findIdea(ideas,'008')));
});

test('resume は既存の編集を保持し、別のIDや未準備の場所では起動しない',async()=>{
  const base=await mkdtemp(path.join(tmpdir(),'app-forge-resume-'));const out=path.join(base,'app');
  assert.equal(run(['start','006','--prepare-only','--out',out]).status,0);
  await writeFile(path.join(out,'APP_BRIEF.md'),'EDITED BY VIEWER');
  assert.equal(run(['resume','006','--prepare-only','--out',out]).status,0);
  assert.equal(await readFile(path.join(out,'APP_BRIEF.md'),'utf8'),'EDITED BY VIEWER');
  assert.notEqual(run(['resume','007','--prepare-only','--out',out]).status,0);
  assert.notEqual(run(['resume','006','--prepare-only','--out',path.join(base,'missing')]).status,0);
});

test('Codexの非対話実行は通常のworkspace-writeで実行し、失敗時も資料を保持する',async()=>{
  if(process.platform==='win32')return;
  const base=await mkdtemp(path.join(tmpdir(),'app-forge-exec-')),bin=path.join(base,'bin'),out=path.join(base,'app'),log=path.join(base,'args.json');await mkdir(bin);
  const fake=path.join(bin,'codex');await writeFile(fake,`#!${process.execPath}\nimport fs from 'node:fs';if(process.argv[2]==='--version')process.exit(0);fs.writeFileSync(process.env.APP_FORGE_TEST_LOG,JSON.stringify(process.argv.slice(2)));\n`);await chmod(fake,0o755);
  const r=run(['start','006','--exec','--out',out],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,APP_FORGE_TEST_LOG:log}});assert.equal(r.status,0,r.stderr);
  const args=JSON.parse(await readFile(log,'utf8'));assert.deepEqual(args.slice(0,4),['exec','--skip-git-repo-check','--sandbox','workspace-write']);assert.equal(args.length,5);assert.ok(args[4].includes('APP_BRIEF.md'));
});
