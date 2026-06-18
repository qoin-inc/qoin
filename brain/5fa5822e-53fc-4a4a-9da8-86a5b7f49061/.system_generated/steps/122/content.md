Title: Vercelを調査していて感じたメリット・デメリット

Source: https://zenn.dev/smartcamp/articles/9d9b4224be862f

---

[SMARTCAMP Engineer Blog](https://zenn.dev/p/smartcamp)
[SMARTCAMP Engineer Blog](https://zenn.dev/p/smartcamp)
[Publicationへの投稿](https://zenn.dev/faq/what-is-publication)

[ma2cta](https://zenn.dev/ma2cta)
[Next.js](https://zenn.dev/topics/nextjs)
[Vercel](https://zenn.dev/topics/vercel)
[frontend](https://zenn.dev/topics/frontend)
[infra](https://zenn.dev/topics/infra)
[PaaS](https://zenn.dev/topics/paas)
[tech](https://zenn.dev/tech-or-idea)

## https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%81%AF%E3%81%98%E3%82%81%E3%81%AB はじめに
この記事について
社内で利用するWebアプリケーションを作成する際に、Vercel社が運営するWebホスティングサービスであるVercelを利用技術として検討しました。 その際に得た知見を複数の記事としてまとめていく予定です。

## https://zenn.dev/smartcamp/articles/9d9b4224be862f#vercel%E3%82%92%E8%AA%BF%E6%9F%BB%E3%81%97%E3%81%A6%E3%81%84%E3%81%A6%E6%84%9F%E3%81%98%E3%81%9F%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88%E3%83%BB%E3%83%87%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88 Vercelを調査していて感じたメリット・デメリット
Vercelについて検討する上で、メリット・デメリットだと感じたことを散発的に記載していきます。 あまり構造化はされていない状態になっています。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E7%B6%99%E7%B6%9A%E7%9A%84%E3%81%AB%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%82%92%E9%81%8B%E7%94%A8%E3%81%97%E3%81%A6%E3%81%84%E3%81%8F%E4%B8%8A%E3%81%A7%E5%BF%85%E8%A6%81%E3%81%AA%E3%82%A4%E3%83%B3%E3%83%95%E3%83%A9%E6%A7%8B%E7%AF%89%E3%81%AB%E3%81%8B%E3%81%8B%E3%82%8B%E4%BD%9C%E6%A5%AD%E5%B7%A5%E6%95%B0%E3%82%92%E5%89%8A%E6%B8%9B%E3%81%A7%E3%81%8D%E3%82%8B 継続的にアプリケーションを運用していく上で必要なインフラ構築にかかる作業工数を削減できる
Next.jsで開発されているアプリケーションであれば、GitHubなどからコードを連携するだけで、インターネットからアクセス可能なアプリケーションとして動かすことが容易にできます。
一例ですが、一般的なWebアプリケーションであれば、
- サーバーの構築
- CI/CDの構築
- 監視の構築
などの手順を経て初めて、アプリケーションとして継続的に運用していく準備が整うと言えますが、Vercelではそれを自前で用意する必要はありません。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#next.js%E3%82%92%E9%96%8B%E7%99%BA%E3%81%97%E3%81%A6%E3%81%84%E3%82%8Bvercel%E7%A4%BE%E3%81%8C%E9%81%8B%E5%96%B6%E3%81%97%E3%81%A6%E3%81%84%E3%82%8B Next.jsを開発しているVercel社が運営している
Vercel社がNext.jsを開発している関係上、VercelでNext.jsのサポートが切られることはほぼ有り得ないと考えられます。 動かしたいアプリケーションの技術としてNext.jsを採用している場合、サポート切れによるリプレイスのリスクなどは極限まで減らすことができると考えられます。
リスク面だけでなく、Next.jsの新機能も積極的にサポートされていくであろうといったプラスの面も期待できます。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%81%E3%83%BC%E3%83%A0%E9%96%8B%E7%99%BA%E3%81%AB%E5%AF%BE%E3%81%99%E3%82%8B%E3%82%B5%E3%83%9D%E3%83%BC%E3%83%88%E3%81%8C%E5%AD%98%E5%9C%A8%E3%81%99%E3%82%8B チーム開発に対するサポートが存在する
環境変数をVercelのプロジェクト上で管理し、各開発者はVercelのCLIツールを用いて常に最新の環境変数をpullすることができたりします。
また、featureブランチをpushした際に自動的に作成されるPreview環境では、動いているアプリケーションの画面にコメントをつけることができるため、コードのみのPRレビューより更に一歩進んだチーム開発体験を感じることができる可能性があります。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%82%A4%E3%83%B3%E3%83%95%E3%83%A9%E8%B2%BB%E7%94%A8%E3%81%AE%E6%9C%80%E9%81%A9%E5%8C%96%E3%81%AB%E5%B7%A5%E6%95%B0%E3%82%92%E6%B8%9B%E3%82%89%E3%81%99%E3%81%93%E3%81%A8%E3%81%8C%E3%81%A7%E3%81%8D%E3%82%8B インフラ費用の最適化に工数を減らすことができる
たとえば、AWSではEC2のインスタンスそれ自体に課金されるため、インフラコストを下げようと思うとEC2のスペックを下げたり稼働時間を少なくするといった工夫が必要になります。
これに対して、（Proプランでは）Vercelは開発者アカウントに対しての課金になるため、サイジングに工数を割くといったことを行う必要がありません。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#vercel%E7%A4%BE%E6%8F%90%E4%BE%9B%E3%81%AE%E3%82%A8%E3%82%B3%E3%82%B7%E3%82%B9%E3%83%86%E3%83%A0%E3%82%92%E5%88%A9%E7%94%A8%E3%81%97%E3%82%84%E3%81%99%E3%81%84 Vercel社提供のエコシステムを利用しやすい
[Turborepoのチュートリアル](https://zenn.dev/hayato94087/articles/d2956e662202a7)
たとえば、モノレポ構成をアプリケーションに採用する場合に、Turborepoを利用しやすいといったことはメリットです。
なお、デプロイ先に Vercel を利用している場合、このリモートキャッシュは自動的に有効化されます。
Next.jsアプリケーションの[ISR](https://vercel.com/docs/incremental-static-regeneration)がVercelだと苦労せずに導入できるといった話も類似の話かと思います。

[Vercel以外でNext.jsのISRをできるのか問題](https://zenn.dev/catnose99/scraps/f1c9a98c5651f1)

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E7%94%BB%E5%83%8F%E3%81%AE%E6%9C%80%E9%81%A9%E5%8C%96%E3%82%92%E5%88%A9%E7%94%A8%E3%81%A7%E3%81%8D%E3%82%8B 画像の最適化を利用できる
[Image Optimization with Vercel](https://vercel.com/docs/image-optimization)
リサイズなどの処理を行ってくれ、それをVercelのEdgeの層でキャッシュしてくれます。 画像をたくさん使うアプリケーションでは画像の最適化が必要になる可能性が高いため、メリットになると思います。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#analytics%E3%83%84%E3%83%BC%E3%83%AB%E3%81%8C%E3%81%82%E3%82%8B Analyticsツールがある
[Vercel Web Analytics](https://vercel.com/docs/analytics)
プラットフォームに組み込まれた分析ツールであり、Cookieを利用しないといった記述があるため、昨今話題のサードパーティクッキーの問題などをおそらく気にしなくてよさそうです。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#api%E3%81%AE%E5%AE%9F%E8%A1%8C%E3%81%8Cserverless-function%E3%81%AB%E3%81%AA%E3%82%8B APIの実行がServerless Functionになる
たとえば、Node.jsを通常のサーバーで動かす場合と比較して、OSのコマンドやファイルシステムにアクセスできません。 また、実行時間にも制限があります。（Proプランでは5分が上限にはなる）

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E3%83%AD%E3%82%B0%E3%81%8C1%E6%97%A5%E3%81%97%E3%81%8B%E4%BF%9D%E6%8C%81%E3%81%95%E3%82%8C%E3%81%AA%E3%81%84 アプリケーションログが1日しか保持されない
アプリケーションが出力するログは最大で1日しか遡ることができません。
業務で利用する本番環境アプリケーションで、1日しか残らないログで要件を満たすことができるケースはあまり多くないと考えるため、実質何らかの手段を用いてログを保存することは必須になると思われます。
Log Drainといった概念でログを保存することができますが、これを提供する別SaaSはVercel提供外のものになるため別途利用料がかかったり、セキュリティが担保されているかを別途確認したりする工数も発生します。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E7%9B%A3%E6%9F%BB%E3%83%AD%E3%82%B0%E3%81%8C%E6%AE%8B%E3%82%89%E3%81%AA%E3%81%84 監査ログが残らない
Enterpriseプランのみ監査ログに対応しており、Proプランだと残らないようです。
[Audit Logs](https://vercel.com/docs/observability/audit-log)
個人情報といった秘匿性の高い情報を取り扱うアプリケーションを業務で作成する場合には、監査ログが必要になるケースが多いと思われるため、問題になる可能性があります。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%9E%E3%83%8D%E3%83%BC%E3%82%B8%E3%83%89%E3%81%AAdb%E3%81%AE%E3%83%AA%E3%83%BC%E3%82%B8%E3%83%A7%E3%83%B3%E3%81%AB%E6%97%A5%E6%9C%AC%E3%81%8C%E3%81%AA%E3%81%84 マネージドなDBのリージョンに日本がない
2025/04/01追記 Vercel Postgresとしてマネージドに提供されていたDBは現在なくなっているようです。 Market Place経由でNeonやSupabaseを利用する形に変わっているようです。 Vercel Postgres自体がNeon提供のものだったため大きく変化はないと思われます。
[Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
DBのリージョンは、日本から一番近いリージョンでもシンガポールになります。 DBはAPI（Serverless Function）が配置されるリージョンと同一リージョンに作成することが推奨されています。
We recommend choosing the same region as your Serverless and Edge Functions for the fastest response times. After creating a database, you cannot change its region. Check your [project's region](https://vercel.com/docs/functions/serverless-functions/regions#select-a-default-serverless-region) before creating your database.

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E4%B8%80%E9%83%A8%E3%81%AE%E8%BF%BD%E5%8A%A0%E6%A9%9F%E8%83%BD%E3%81%AB%E3%81%AF%E8%BF%BD%E5%8A%A0%E3%81%AE%E8%AA%B2%E9%87%91%E3%81%8C%E5%BF%85%E8%A6%81%E3%81%AB%E3%81%AA%E3%82%8B 一部の追加機能には追加の課金が必要になる
[Pricing – Vercel](https://vercel.com/pricing)
いわゆる痒い所に手が届く機能で課金を促してくるため、本番アプリケーションとして運用する場合に欲しいものを全部求めているととんでもない金額になる可能性があります。
たとえば、DBのCompute Timeも課金対象です。 弊社では、社内で利用するアプリケーションでのVercel利用を検討しているため、毎日業務時間8時間中にずっと何らかのDBアクセスが発生すると制限である100時間を超過するような計算になります。
また、並列でビルドを走らせるのも課金対象であり、プロジェクトがスケールしていくにつれて問題が発生する可能性はあります。
[Managing Concurrent Builds](https://vercel.com/docs/deployments/concurrent-builds)

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#vercel%E3%81%AE%E5%89%8D%E3%81%ABcdn%E3%82%92%E9%85%8D%E7%BD%AE%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84 Vercelの前にCDNを配置できない
[Edge Network](https://vercel.com/docs/edge-network/overview#using-vercel's-edge-network-with-other-cdns)
• Vercel の前に追加の CDN を使用すると、Vercel が他のプロバイダーを制御できないため問題が発生し、古いコンテンツが提供されたり、404 エラーが返されたりする可能性があります。
弊社では社内利用を想定しているためあまりCDNの重要性は高くありませんが、一般的なアプリケーションでは問題になる可能性があります。 ただし、Vercel自体がインフラとしてエッジネットワークを構築しているため、それで満足できる場合は問題にならないかもしれません。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#vercel%E3%81%A7%E6%8F%90%E4%BE%9B%E3%81%95%E3%82%8C%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84%E3%82%A4%E3%83%B3%E3%83%95%E3%83%A9%E3%82%92%E5%88%A9%E7%94%A8%E3%81%97%E3%81%9F%E3%81%84%E5%A0%B4%E5%90%88%E7%B5%90%E5%B1%80vercel%E5%A4%96%E3%81%A7%E6%A7%8B%E7%AF%89%E3%81%99%E3%82%8B%E5%BF%85%E8%A6%81%E3%81%8C%E3%81%82%E3%82%8B Vercelで提供されていないインフラを利用したい場合結局Vercel外で構築する必要がある
たとえば何らかの非同期処理のためにメッセージキューイングを利用したい、となった場合にAWS SQSを利用する、といった形になる可能性があります。
マルチクラウドな状態は管理が煩雑になるため、それであれば最初から全てAWSに寄せてしまった方がよいとなる可能性があります。

#### https://zenn.dev/smartcamp/articles/9d9b4224be862f#iaac%E3%81%AF%E5%AE%9F%E7%8F%BE%E3%81%A7%E3%81%8D%E3%81%AA%E3%81%84 IaaCは実現できない
基本的にはVercelのダッシュボードから設定をぽちぽち変更することなるため、インフラ設定をコードで管理したい場合は向きません。
監査ログが残らないのも合わさって、「設定がいつの間にか変わっているがいつ変わったか、誰が変えたかわからない」といったことが起こる可能性もあります。
[ma2cta](https://zenn.dev/ma2cta)
バックエンドの経験が長いですが、最近はフロントエンドもやっています。
[SMARTCAMP Engineer Blog](https://zenn.dev/p/smartcamp)
[Publication](https://zenn.dev/faq/what-is-publication)
SMARTCAMPに所属するエンジニアの個人記事を集めています。 記事の内容は個人の見解であり、社内でのレビュー等は行っておりません。

[ma2cta](https://zenn.dev/ma2cta)
バックエンドの経験が長いですが、最近はフロントエンドもやっています。
1. [はじめに](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%81%AF%E3%81%98%E3%82%81%E3%81%AB)
2. [Vercelを調査していて感じた[メリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)・[デメリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%87%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)](https://zenn.dev/smartcamp/articles/9d9b4224be862f#vercel%E3%82%92%E8%AA%BF%E6%9F%BB%E3%81%97%E3%81%A6%E3%81%84%E3%81%A6%E6%84%9F%E3%81%98%E3%81%9F%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88%E3%83%BB%E3%83%87%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)メリットデメリット
3. [メリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)
4. [デメリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%87%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)
[はじめに](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%81%AF%E3%81%98%E3%82%81%E3%81%AB)
[Vercelを調査していて感じたメリット・デメリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#vercel%E3%82%92%E8%AA%BF%E6%9F%BB%E3%81%97%E3%81%A6%E3%81%84%E3%81%A6%E6%84%9F%E3%81%98%E3%81%9F%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88%E3%83%BB%E3%83%87%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)
1. [メリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)
2. [デメリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%87%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)
[メリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)
[デメリット](https://zenn.dev/smartcamp/articles/9d9b4224be862f#%E3%83%87%E3%83%A1%E3%83%AA%E3%83%83%E3%83%88)
エンジニアのための情報共有コミュニティ

#### About
- [Zennについて](https://zenn.dev/about)
- [運営会社](https://classmethod.jp)
- [お知らせ・リリース](https://info.zenn.dev)
- [イベント](https://zenn.dev/events)
[Zennについて](https://zenn.dev/about)
[運営会社](https://classmethod.jp)
[お知らせ・リリース](https://info.zenn.dev)
[イベント](https://zenn.dev/events)

#### Guides
- [使い方](https://zenn.dev/manual)
- [法人向けメニュー](https://zenn.dev/biz-lp)New
- [Publication / Pro](https://zenn.dev/publications)
- [よくある質問](https://zenn.dev/faq)
[使い方](https://zenn.dev/manual)
[法人向けメニュー](https://zenn.dev/biz-lp)
[Publication / Pro](https://zenn.dev/publications)
[よくある質問](https://zenn.dev/faq)

#### Links
- [X(Twitter)](https://twitter.com/zenn_dev)
- [GitHub](https://github.com/zenn-dev)
- [メディアキット](https://zenn.dev/mediakit)
[X(Twitter)](https://twitter.com/zenn_dev)
[GitHub](https://github.com/zenn-dev)
[メディアキット](https://zenn.dev/mediakit)

#### Legal
- [利用規約](https://zenn.dev/terms)
- [プライバシーポリシー](https://zenn.dev/privacy)
- [特商法表記](https://zenn.dev/terms/transaction-law)
[利用規約](https://zenn.dev/terms)
[プライバシーポリシー](https://zenn.dev/privacy)
[特商法表記](https://zenn.dev/terms/transaction-law)

