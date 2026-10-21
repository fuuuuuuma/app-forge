# App Store・Google Play・Chrome Web Storeまで

確認日：2026-10-21。対象OS、アカウント、国、アプリ機能で条件は変わる。着手時と提出直前に下記の公式資料を読み直す。以下は提出を支援する手順で、審査合格の保証ではない。

## 最初に決める

対象ストア、既存アプリか新規か、アカウントの種別・利用可能なビルド環境、ログイン/課金/広告/トラッキング/子ども向けの有無を確認する。本人確認・規約同意・会費支払いは本人に案内する。料金や必要SDKの版を記憶だけで決めない。

`release/RELEASE_STATUS.md` に、ローカル検証→署名ビルド→テスト配信→審査提出→承認→公開の状態、ストアのバージョン/ビルド番号、確認日時、残作業を残す。認証情報は含めない。

## iOS / App Store

1. Bundle ID・バージョン・署名、必要な端末権限と説明、対応端末を揃える。現在のSDK条件を[Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)で確認する。
2. 実機で起動・主操作・ログイン・オフライン時を試す。アカウントを作るアプリは削除導線、第三者ログインは適用される要件を[審査ガイドライン](https://developer.apple.com/app-store/review/guidelines/)で確認する。Webを包む構成も最低限の機能要件を確認する。デジタル課金は対象国と機能に合う現行ルールで判断する。
3. 署名済みビルドをアップロードし、処理結果を確認。TestFlightで配信し、必要なテストを行う。Expoの場合も、EAS Submitでアップロードしただけでは一般公開されない。[EAS Submit公式](https://docs.expo.dev/submit/introduction/)。
4. 説明文・スクリーンショット・サポート/プライバシーURL・年齢区分・輸出コンプライアンス等を、実際の実装に合わせて入力する。[App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)はSDKが集める情報も確認する。
5. 審査で必要なログイン方法・操作・デモ用データを渡し、対象ビルドを選んで[審査へ提出](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/)。公開方式も確認し、結果を記録する。

## Android / Google Play

1. アプリID、versionCode、署名用鍵、AAB、対象APIレベルを揃える。鍵のバックアップとアクセス範囲を決める。現在の[対象API要件](https://support.google.com/googleplay/android-developer/answer/11926878)を確認する。
2. 実機→内部テスト→必要なクローズドテストへ進む。対象となる新しい個人アカウントでは、確認日時点で12人以上が14日間継続して参加するクローズドテスト等が求められる。[適用条件と本番アクセス申請](https://support.google.com/googleplay/android-developer/answer/14151465)を本人のアカウントに照らす。人数だけ揃えて公開可としない。
3. ストア掲載情報、コンテンツレーティング、広告、対象年齢、アプリへのアクセス方法、[Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)、[アカウント削除](https://support.google.com/googleplay/android-developer/answer/13327111)等の該当項目を実装に合わせて整える。
4. テストの結果とコンソールの警告を解決し、[リリースの準備と公開](https://support.google.com/googleplay/android-developer/answer/9859348)の現行手順で対象トラックへ提出する。EASのAndroid送信は設定したトラックへリリースを作るため、初回はinternalやdraft等の設定を確認する。アップロード済みと製品版公開を区別する。

## Chrome Web Store

Manifest V3・最小権限・外部通信・収集データを確認。秘密鍵、開発キャッシュ、個人用設定を除いたZIPを作る。アイコンと画面、説明文、プライバシーの記載、権限の用途を揃えて[Developer Dashboardへアップロード](https://developer.chrome.com/docs/webstore/publish)する。パッケージ化されていない拡張を読み込めただけでは公開済みにしない。

## 作成する提出セット

- `release/store-listing.md`：アプリ名、短文/長文、カテゴリ、サポートURL。文字数条件はそのストアで確認。
- `release/privacy-data-map.md`：データ種類、目的、端末/サーバー/第三者、保存期間、削除方法、利用SDK。未確認は未確認と記す。
- `release/screenshots.md`：対象端末・必要サイズ・撮影する画面一覧と実ファイル。
- `release/review-notes.md`：審査担当の操作、必要なテスト用ログインの受け渡し方法、機能の場所。実パスワードはGitに入れない。
- `release/test-report.md`：環境・ビルド・実施した操作・結果・未確認。差し戻し時は理由と対応の差分も残す。

キーや端末が未提供でも作れる資料・モック・ローカル試験を終え、残っている本人操作と理由を1つずつ示す。提出や公開が許可済みなら繰り返し許可を求めず進める。申請が通らない場合は無闇な再提出をせず、指摘箇所を再現・修正・確認してから次の提出を決める。
