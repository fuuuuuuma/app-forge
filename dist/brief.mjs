export const platformNames = { web: 'Webアプリ', mobile: 'モバイルアプリ', extension: 'Chrome拡張' };

export function findIdea(ideas, value) {
  const id = String(value ?? '').padStart(3, '0');
  const idea = ideas.find(x => x.id === id || x.slug === value);
  if (!idea) throw new Error('制作アイデアが見つかりません。001〜100のIDを指定してください。');
  return idea;
}

export function makeBrief(idea) {
  return `# ${idea.title}\n\nApp Forge 制作アイデア ${idea.id} / ${platformNames[idea.platform]}\n\n## 誰のために\n${idea.audience}\n\n## 解決したいこと\n${idea.summary}\n\n## 最初の機能\n${idea.features.map(x => '- ' + x).join('\n')}\n\n## 主なデータ\n${idea.data.map(x => '- ' + x).join('\n')}\n\n## 完成の確かめ方\n${idea.acceptance.map(x => '- ' + x).join('\n')}\n\n## この案の注意点\n${idea.caution}\n\n## 開発の進め方\n同梱の app-forge スキルを読み、この指示書に沿って実装・起動・主要操作の確認まで進めてください。足りない細部は仮置きし、最初の1本の操作から作ってください。APIキー待ちなら明記したモックで試せる状態を作ってください。公開・外部アップロード・課金・本番変更は対象と費用の明示許可を確認し、未許可ならローカル成果物まで進めてください。ストア希望なら公開準備資料も作ってください。未確認の動作は区別してAPP_STATUS.mdへ残してください。\n\nこの案は制作のきっかけです。完成品や審査合格実績ではありません。${idea.inspiration ? '\n着想元: ' + idea.inspiration + '\n名称・文章・素材をコピーせず独自に実装してください。' : ''}\n`;
}

export function makePrompt(idea, skillPath = '.agents/skills/app-forge/SKILL.md') {
  return `同梱のスキル ${skillPath} を読んでください。\nAPP_BRIEF.md の「${idea.title}」を開発してください。企画だけで止めず、実装・起動・主要操作の確認まで進めてください。参考アプリの素材・名前は独自にしてください。ユーザーの既存指示と権限を尊重し、公開・外部アップロード・課金・本番の変更は対象と費用の明示許可に含まれる範囲で進め、未許可の操作だけ確認してください。未確認事項と再開手順をAPP_STATUS.mdに残してください。`;
}

export function launchCommand(idea, agent = 'codex') {
  if (!['codex', 'claude'].includes(agent)) throw new Error('対応エージェントはcodexかclaudeです。');
  return `npx --yes --package github:fuuuuuuma/app-forge#v0.2.0 app-forge start ${idea.id} --agent ${agent}`;
}
