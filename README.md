# meshi

摂取カロリーを記録し、目標に対する進捗を日次・週次・月次で可視化／グラフ化するローカルツール。

- 摂取カロリーを簡単に記録（食品マスタから選択）
- 目標摂取カロリーを登録（期間ごとに変更可能）
- 目標に対する進捗の可視化（日次・週次・月次）
- カロリー推移のグラフ化

## クイックスタート（npx）

npm に公開済みの [`@minimalcorp/meshi`](https://www.npmjs.com/package/@minimalcorp/meshi) を使えば、リポジトリを clone せずに起動できます。

```bash
npx @minimalcorp/meshi
```

- web UI: http://localhost:6250 （自動でブラウザが開きます）
- API server: http://localhost:6251
- データは `~/.meshi/state/meshi.db` に永続化（`MESHI_DATA_DIR` で変更可）
- 対応 OS: macOS / Linux

> パッケージ詳細は [apps/cli/README.md](apps/cli/README.md) を参照。

## 技術構成

- **monorepo**: npm workspaces (`apps/*`)
- **web**: Next.js (App Router) + TypeScript + Tailwind
- **server**: Fastify + Prisma
- **DB**: SQLite（データは `~/.meshi/state/meshi.db` に永続化。`MESHI_DATA_DIR` で変更可）
- **グラフ**: visx (`@visx/*`)
- **配布**: `apps/cli` を `@minimalcorp/meshi` として npm 公開。`prepack` で web(Next standalone) + server を1パッケージに bundle（[apps/cli/scripts/bundle.mjs](apps/cli/scripts/bundle.mjs)）

ポート（dev と docker で分離し、同時起動しても衝突しない）:

|                                 | web  | server | docs |
| ------------------------------- | ---- | ------ | ---- |
| `npx @minimalcorp/meshi`        | 6250 | 6251   | —    |
| `make dev`（開発・docker）      | 5350 | 5351   | 6260 |
| `make up`（本番ビルド・docker） | 5250 | 5251   | —    |

> npx 起動時の server ポート (6251) は web ビルドに焼き込まれているため固定です（web ポートは `PORT` env で変更可）。

## 開発（docker でホットリロード起動）

`make dev` は **docker 上で server + web + docs を同時にホットリロード起動**します（ローカルに Node.js を入れる必要はありません）。データは使い捨ての `./.meshi-dev` に隔離され、実データ `~/.meshi` とは分離されます。

```bash
make dev        # docker で起動（web=5350 / server=5351 / docs=6260, HMR）
make dev-logs   # ログ表示
make dev-down   # 停止 & container 削除（開発データ ./.meshi-dev は保持）
make dev-clean  # container & volume + 開発データ ./.meshi-dev を破棄
```

- web: http://localhost:5350
- server: http://localhost:5351
- docs: http://localhost:6260
- ソースは bind mount され、編集は即反映されます（node_modules はコンテナ内のものを使用）。

> ローカルの IDE 補完／型チェック用に依存を入れたい場合のみ `make install` を実行（dev 自体は docker 内で完結するため任意）。

## docker で本番稼働を確認

`make up` は本番稼働を想定し、web + server をビルドして起動します。**データはホストの `~/.meshi` に永続化**されます（bind mount）。

```bash
make up     # ビルドして起動（web=5250 / server=5251, ~/.meshi に永続化）
make logs   # ログ表示
make down   # 停止 & container削除（~/.meshi のデータはホストに保持）
```

> 注: `make dev`（web=5350 / server=5351 / docs=6260 / データ=`./.meshi-dev`）と
> `make up`（web=5250 / server=5251 / データ=`~/.meshi`）はポートもデータも完全に別です。

## リリース（npm 公開 / docs デプロイ）

GitHub Actions の `Release` workflow を手動実行することで、`@minimalcorp/meshi` の npm 公開、および docs サイトの GitHub Pages デプロイを統合的に行えます。

1. GitHub の Actions タブから `Release` workflow を選択
2. 以下を入力して Run:
   - **target**: `all` / `meshi` / `docs` のいずれか
   - **version**: `patch` / `minor` / `major`（meshi の npm publish にのみ適用 / docs には無視される）
3. `production-release` Environment の承認待ちになるので、承認画面で main の最新状態を確認して承認
4. 承認後、target に応じて自動実行:
   - **meshi**: version bump → tag push → `npm publish`（prepack で web+server を bundle）→ GitHub Release 作成
   - **docs**: `apps/docs` を静的エクスポート → GitHub Pages へデプロイ（公開先: https://minimalcorp.github.io/meshi/ ）

詳細は [.github/workflows/release.yml](.github/workflows/release.yml) を参照。

### 初回実行前の必須セットアップ

初めて `Release` workflow を実行する前に、以下を手動で設定しておく必要があります。

1. **npm Organization 準備**
   - npmjs.com で `@minimalcorp` organization を作成（未作成の場合）
   - `@minimalcorp/meshi` パッケージ名が未取得であることを確認

2. **初回バージョンを手元で publish**（必須・初回のみ）
   - **npm の Trusted Publishing はパッケージが既に存在することが前提**で、未作成の状態では Trusted Publisher を設定できない（PyPI のような "pending publisher" は npm には未実装 → [npm/cli#8544](https://github.com/npm/cli/issues/8544)）。
   - そのため **初回 1 回だけはトークン認証で手元から publish** して、パッケージ名を npm 上に作る必要がある:
     ```bash
     npm login                                          # 2FA 有効なら OTP 入力
     npm publish --workspace=@minimalcorp/meshi --access public
     # ↑ prepack が走り web(standalone)+server を bundle して公開される
     ```
   - 2 回目以降は下記 Trusted Publishing 経由（手元 publish 不要）に切り替わる。

3. **npm Trusted Publisher を登録**（npm 側・初回 publish 後）
   - 2 回目以降の workflow は **npm Trusted Publishing (OIDC)** を使うため `NPM_TOKEN` は不要
   - 初回 publish でパッケージが存在するようになったら、npmjs.com のパッケージ設定 → Trusted Publisher を追加: organization=`minimalcorp`, repository=`meshi`, workflow=`release.yml`, environment=`production-release`
   - Trusted Publishing は npm CLI v11.5.1 以降が必要（workflow 側で `npm install -g npm@latest` 済み）

4. **`production-release` Environment の作成と承認者設定**（必須）
   - Settings → Environments → `New environment` → 名前を `production-release` として作成
   - **Required reviewers** を有効化し、リリース承認権限を持つメンバー（自分自身でも可）を追加
   - Release workflow の `approve` job はこの Environment 配下で実行されるため、実行時に GitHub UI で明示的な承認操作が必要になる

5. **`main` ブランチ保護の bypass 設定**（保護ルールを設定している場合）
   - `Release` workflow は `npm version` で bump した commit と tag を `main` に直接 push する
   - 保護ルールがある場合、`github-actions[bot]` は user role を持たないため Bypass list に明示設定が必要:
     - 独立した **Deploy key** を発行 → public key を Deploy keys に登録（write access）→ private key を `RELEASE_DEPLOY_KEY` secret に登録 → main ruleset の Bypass list に追加（推奨）
   - 保護ルールを main に設定していない場合は不要

6. **GitHub Pages を Actions ソースに設定**（docs をデプロイする場合）
   - Settings → Pages → Source: **GitHub Actions** を選択（`Deploy from a branch` ではない）
   - `deploy-docs` job は `github-pages` Environment を使うため、初回デプロイ時に Environment が自動作成される

これらを設定せずに workflow を実行すると、途中で失敗してバージョン番号だけが bump された中途半端な状態になる可能性があるので、**必ず事前に設定してください**。

> **初回 publish について**: npm の Trusted Publishing は「パッケージが既に存在する」ことが前提のため、**初回バージョンだけはトークン認証で手元から publish する必要があります**（上記ステップ2）。PyPI の "pending publisher"（未作成パッケージへの事前登録）に相当する機能は npm には未実装です（[npm/cli#8544](https://github.com/npm/cli/issues/8544)、2026-06 時点 open）。2 回目以降は `Release` workflow の Trusted Publishing 経由となり、トークンは不要です。

## リポジトリ構成

```
meshi/
├── apps/
│   ├── web/                  # @meshi/web    (Next.js UI, private)
│   ├── server/               # @meshi/server (Fastify + Prisma, private)
│   ├── cli/                  # @minimalcorp/meshi (公開パッケージ / npx 起動)
│   └── docs/                 # meshi-docs (Nextra ドキュメントサイト, private)
├── .github/workflows/
│   ├── ci.yml                # PR CI (format / lint / type-check / build)
│   └── release.yml           # npm publish + docs Pages デプロイ (承認ゲート)
├── docker/                   # docker 稼働 (make up)
├── LICENSE                   # PolyForm Shield 1.0.0
└── package.json              # monorepo root (workspaces)
```

## ドキュメント

- **公開ドキュメントサイト**: https://minimalcorp.github.io/meshi/ （`apps/docs` / Nextra）
  - ローカルプレビュー: `make dev` で docs も起動（http://localhost:6260 ）
- 内部メモ:
  - [開発計画](docs/development-plan.md)
  - [開発メモ（不明点・判断ログ）](docs/dev-notes.md)
