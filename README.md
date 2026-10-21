# アプリ開発のすゝめ / App Forge

**作りたいものを、動くアプリへ。** Web・iOS/Android・Chrome拡張の企画、参考アプリの観察、実装、テスト、公開準備を支援する日本語スキルです。

**[100個の制作アイデアから選ぶ →](https://app-forge-100.fuuma.chatgpt.site)**

100選はアイデア集です。すべてのアプリの完成コードや成功実績を配るものではありません。各案に対象者、最初の3機能、データモデル、完成の確かめ方、注意点があります。KIRU・MIRU・Chrome拡張で得た設計判断と、出典を明記した外部事例の着想を収録しています。

## Codexへ、2行で導入

ターミナルで実行します。Codex CLIとログインは別途必要です。

```sh
codex plugin marketplace add fuuuuuuma/app-forge
codex plugin add app-forge@app-forge
```

新しいチャットで、例えば次のように伝えます。

> $app-forge を使って、家族で使う買い物リストをWebアプリで作って。まずはローカルで、登録・チェック・再読込ができるところまで。

## Claude Codeへ、2行で導入

ターミナルで実行します。Claude Code CLIとログインは別途必要です。

```sh
claude plugin marketplace add fuuuuuuma/app-forge
claude plugin install app-forge@app-forge
```

新しいチャットで `/app-forge:app-forge` と作りたいものを伝えます。既存アプリの改修にも使えます。

## 100選から、そのまま開発を始める

サイトの「このアプリを作る」から、機能・合格条件を確認し、起動コマンドをコピーします。手元のターミナルで実行すると新しいフォルダ、`APP_BRIEF.md`、スキルを用意し、AIのCLIを起動します。プラグインを別途入れていなくても、この経路にはスキルが同梱されます。

```sh
npx --yes --package github:fuuuuuuma/app-forge#v0.1.0 app-forge start 004 --agent codex
```

Claude Codeを使うなら `--agent claude`。Node.js 20以上・npm・Git・選んだAIのCLIとログインが必要です。初回はGitHubからパッケージを取得します。AIの利用は本人のプランに従います。CLIは通常の承認設定を維持し、公開・課金を自動承認しません。

初期の作業場所は現在のフォルダの `apps/<アイデアのslug>`。既存のフォルダは上書きしません。別の場所を使うには `--out ./my-new-app`。資料だけ作るには `--prepare-only`、何も変更せず指示を確認するには `--dry-run`。一覧は `app-forge list`。

```sh
npx --yes --package github:fuuuuuuma/app-forge#v0.1.0 app-forge start 004 --prepare-only --out ./my-new-app
```

WebページがPCを勝手に操作することはありません。サイトを開く→案を選ぶ→コマンドを本人が実行する、という流れです。CLIなしの場合は、スキル導入後に「チャット用の指示をコピー」を使えます。

ランチャーの動作確認環境はmacOS・Node.js 24。Linux・Windowsの実機起動は未確認です。Windowsでは環境によって`.cmd`の起動方法が異なるため、WSL、指示書ダウンロード、または `--prepare-only` から始めてください。スマホからサイトで案を選び、PCで開発を続けることもできます。

## どこまで手伝う？

- 参考アプリの画面と行動を観察し、独自の名前・素材・仕様で実装
- 入力→処理→保存→再表示を通し、読み込み/空/失敗/戻るも確認
- Web・PWA・モバイル・Chrome拡張から目的に合う構成を選択
- Sites・Cloudflare・Codex App Serverの用途と採用条件を整理
- App Store・Google Play・Chrome Web Store向けにビルド、説明文、画面素材、プライバシー情報、審査手順を準備し、許可された提出と差し戻しへの対応を支援

ストアの本人確認・規約同意・開発者登録は本人が行います。必要なアカウント、端末、署名、クラウド、AI利用の費用は別途。ストアごとの現行条件を公式資料で確認します。審査への提出と一般公開は区別し、合格は保証しません。

[スキル本体](plugins/app-forge/skills/app-forge/SKILL.md) · [ストア公開ガイド](plugins/app-forge/skills/app-forge/references/store-release.md) · [構成と配布先](plugins/app-forge/skills/app-forge/references/platforms.md) · [出典と確認範囲](plugins/app-forge/skills/app-forge/references/sources.md) · [100選JSON](catalog/ideas.json)

## このリポジトリを動かす

開発依存パッケージなし。Node.js 20以上。プレビューにはPython 3を使います。

```sh
git clone https://github.com/fuuuuuuma/app-forge.git
cd app-forge
npm run build
npm test
npm run dev
```

`site/` がサイトのソース、`dist/` が配布用の静的ファイルです。`catalog/ideas.json` を直してビルドすると、サイトとスキルの100選を同時に更新します。アイデア単体の取得は `node plugins/app-forge/skills/app-forge/scripts/idea.mjs 007`。

## ライセンス

本リポジトリの独自コード・文章はMIT。外部のリンク先、参考アプリ、第三者のロゴ・素材の権利は各権利者に帰属します。外部事例の本文・動画・非公開コード・作者の運用データは同梱していません。
