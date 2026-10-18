# 承認付きNetlifyデプロイ

本番デプロイは、計画作成と承認後の実行を分離します。承認は1回限りで、15分後、失敗後、またはブランチ・コミット・ビルド変更後には無効になります。

## 1. ビルド

```powershell
npm run build
```

## 2. デプロイ計画を表示

プレビュー（既定）:

```powershell
npm run deploy:plan
```

独立した検証サイト `el-town-staging` への公開:

```powershell
$env:NETLIFY_SITE_ID = '4e00785b-ffe1-4e3b-bc45-c1ab26d7a3ba'
npx.cmd --yes netlify-cli@26.1.0 build --context production
npm run deploy:plan -- --staging
```

検証サイトのURLは `https://el-town-staging.netlify.app`。`--staging` は専用のSite IDと `staging-invite-server` ブランチを要求し、検証用Supabase接続値とLINE・Stripe等の無効化設定をNetlify側で照合する。計画作成時・承認後の実行直前に設定が一致しなければ停止する。CLIのリンク先が本番サイトでも、検証用Site IDを環境変数とデプロイ引数の両方で指定する。検証サイトのURLへ公開するためCLI内部では `--prod` を使うが、対象Site IDは本番サイトと別である。

検証用Supabaseの秘密値をNetlifyへ設定する場合は、送信先と対象キーについて利用者の明示的な承認を得る。秘密値を承認文字列、ログ、文書へ載せない。

本番:

```powershell
npm run deploy:plan -- --prod
```

画面にはサービス、サイト、環境、ブランチ、コミットID、ビルドID、送信対象、実行コマンド、期限が表示されます。秘密情報は表示しません。

## 3. Codexとの会話で承認

Codexがデプロイを担当する場合は、計画に表示された `APPROVE DEPLOY ...` の承認文字列だけを利用者へ提示します。利用者が同じ文字列をチャットへ返信したことを確認してから、Codexが `deploy:approved` を実行します。

一般的な「OK」「デプロイしてください」だけでは実行せず、サイト、環境、コミットID、nonceを含む承認文字列の完全一致を必要とします。

## 4. 表示された承認コマンドを実行

計画作成時に表示された `npm run deploy:approved ...` を、そのまま実行します。承認内容は計画と完全一致する必要があります。

## 5. 結果確認

完了時に以下を照合します。

- 公開URLへ接続できること
- 実行前後でコミットIDが変わっていないこと
- 本番HTMLとローカルビルドIDが一致すること
- NetlifyのデプロイIDが取得できること

履歴は `.deploy/deployments.jsonl` に追記されます。このフォルダはGit管理外です。

## 注意

- `.env.local` やNetlifyトークンを設定ファイル、承認文字列、ログへ記載しないでください。
- 失敗した場合は、もう一度 `deploy:plan` からやり直してください。
- Codex実行環境の外部送信ポリシーが拒否した場合は、同じ承認コマンドを利用者のPowerShellで実行してください。
