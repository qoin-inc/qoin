# Codex project instructions

## Netlify deployment approval

本番・プレビューデプロイでは、必ず `docs/admin/safe-deployment.md` の承認付き手順を使う。

1. ビルド後、`npm.cmd run deploy:plan -- --prod`（プレビューは `npm.cmd run deploy:plan`）を実行する。
2. 出力された `APPROVE DEPLOY ...` の文字列を利用者へ提示する。
3. 利用者が同じ承認文字列をチャットへ返信するまで、デプロイを実行しない。
4. 返信が完全一致した場合だけ、出力された `deploy:approved` コマンドを実行する。
5. 公開URL、デプロイID、コミットID、ビルドIDの照合結果を報告する。

承認は1回限りで有効期限がある。実行失敗、期限切れ、コミットまたはビルド変更時は、必ず新しい計画を作成して再承認を受ける。承認文字列、ログ、文書へ認証情報やAPIキーを含めない。
