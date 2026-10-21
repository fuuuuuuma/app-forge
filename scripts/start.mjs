#!/usr/bin/env node
import { readFile, mkdir, writeFile, cp, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { findIdea, makeBrief, makePrompt } from '../lib/brief.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const packageInfo = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const usage = '使い方: app-forge start|resume 001 [--agent codex|claude] [--out フォルダ] [--prepare-only] [--dry-run] [--exec]\napp-forge list で100選を表示。resumeは生成済みの作業を再開します。--exec はCodexの非対話実行です。\nNode.js 20以上、npm・Git、選んだAIのCLIとログインが必要です。';

async function main() {
  if (!args.length || args.includes('--help') || args.includes('-h')) return console.log(usage);
  const ideas = JSON.parse(await readFile(path.join(root, 'catalog/ideas.json'), 'utf8'));
  const action = args.shift();
  if (action === 'list') return console.log(ideas.map(x => `${x.id}  ${x.title} (${x.platform})`).join('\n'));
  if (!['start', 'resume'].includes(action)) throw new Error(usage);
  const idea = findIdea(ideas, args.shift());
  let agent = 'codex', out, dry = false, prepare = false, exec = false;
  while (args.length) {
    const flag = args.shift();
    if (flag === '--agent' || flag === '--out') {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error(`${flag} の値が必要です。`);
      if (flag === '--agent') agent = value; else out = value;
    } else if (flag === '--dry-run') dry = true;
    else if (flag === '--prepare-only') prepare = true;
    else if (flag === '--exec') exec = true;
    else throw new Error(`不明な引数: ${flag}`);
  }
  if (!['codex', 'claude'].includes(agent)) throw new Error('--agent はcodexかclaudeです。');
  if (exec && agent !== 'codex') throw new Error('--exec はCodexでのみ対応しています。Claude Codeは通常の対話起動を使ってください。');
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node.js 20以上が必要です。https://nodejs.org/en/download から導入してください。');
  const destination = path.resolve(out || path.join('apps', idea.slug));
  if (dry) return console.log(JSON.stringify({ idea: idea.id, destination, agent, action, prepareOnly: prepare, exec, prompt: makePrompt(idea) }, null, 2));
  if (action === 'resume') {
    let marker;
    try { marker = JSON.parse(await readFile(path.join(destination, '.app-forge.json'), 'utf8')); }
    catch { throw new Error('再開用の記録が見つかりません。作成済みのアプリのフォルダを --out で指定してください。'); }
    if (marker.idea !== idea.id) throw new Error('このフォルダは別の制作アイデアの作業です。IDと --out の場所を確認してください。');
    for (const file of ['APP_BRIEF.md', '.agents/skills/app-forge/SKILL.md']) await access(path.join(destination, file));
  } else {
    try { await access(destination); throw new Error(`すでに存在するフォルダです。続きは resume ${idea.id} --out で同じ場所を指定するか、start の --out に新しい場所を指定してください: ${destination}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!prepare) {
    const probe = spawn(agent, ['--version'], { stdio: 'ignore', shell: false });
    await new Promise((resolve, reject) => { probe.on('error', () => reject(new Error(`${agent} CLIが見つかりません。先にインストールしてログインしてください。--prepare-only なら資料だけ作成します。`))); probe.on('exit', code => code === 0 ? resolve() : reject(new Error(`${agent} CLIの起動を確認できませんでした。`))); });
  }
  if (action === 'start') {
  await mkdir(path.dirname(destination), { recursive: true });
  await mkdir(destination); // 競合時も既存フォルダは使わない
  const source = path.join(root, 'plugins/app-forge/skills/app-forge');
  for (const folder of ['.agents/skills/app-forge', '.claude/skills/app-forge']) {
    await cp(source, path.join(destination, folder), { recursive: true, errorOnExist: true, force: false });
  }
  await writeFile(path.join(destination, 'APP_BRIEF.md'), makeBrief(idea), { flag: 'wx' });
  await writeFile(path.join(destination, 'AGENTS.md'), '# このアプリの作業\n\nAPP_BRIEF.mdと .agents/skills/app-forge/SKILL.md を読み、動くアプリまで進めてください。公開・外部アップロード・課金・本番変更は、対象と費用が明示許可に含まれるか確認してください。未確認の動作はAPP_STATUS.mdに残してください。\n', { flag: 'wx' });
  await writeFile(path.join(destination, 'APP_STATUS.md'), `# 開発状況\n\n制作アイデア ${idea.id} の指示書とスキルを準備済み。アプリの実装・起動・実機検証はまだ行っていません。\n\n再開: このフォルダで ${agent} を起動し、APP_BRIEF.mdをもとに開発してください。\n`, { flag: 'wx' });
  await writeFile(path.join(destination, '.gitignore'), 'node_modules/\n.env\n.env.*\n!.env.example\n.expo/\n.DS_Store\n', { flag: 'wx' });
  await writeFile(path.join(destination, '.app-forge.json'), JSON.stringify({ idea: idea.id, agent, version: packageInfo.version }, null, 2) + '\n', { flag: 'wx' });
  }
  console.log(`準備できました: ${destination}\n${idea.title}\n`);
  if (prepare) return console.log(action === 'start' ? '資料を作成しました。アプリ本体は未実装です。resume からAIと開発を始められます。' : '再開する資料を確認しました。既存ファイルは変更していません。');
  console.log(`${agent} を起動します。通常の承認設定で進みます。終了は Ctrl+C。\n`);
  const launchArgs = exec ? ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', makePrompt(idea)] : [makePrompt(idea)];
  const child = spawn(agent, launchArgs, { cwd: destination, stdio: 'inherit', shell: false });
  child.on('error', e => { console.error(`起動できませんでした: ${e.message}\n作成した資料は ${destination} に残っています。`); process.exitCode = 1; });
  child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : (code ?? 1); });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
