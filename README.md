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

|                               | web  | server |
| ----------------------------- | ---- | ------ |
| `npx @minimalcorp/meshi`      | 6250 | 6251   |
| `make dev`（ローカル開発）    | 5350 | 5351   |
| `make up`（docker・本番想定） | 5250 | 5251   |

> npx 起動時の server ポート (6251) は web ビルドに焼き込まれているため固定です（web ポートは `PORT` env で変更可）。

## セットアップ / 起動

```bash
make install   # 依存インストール
make dev       # web + server を同時起動
```

- web: http://localhost:5350
- server: http://localhost:5351
- データは使い捨ての `./.meshi-dev` に保存（実データ `~/.meshi` とは分離）。破棄は `make dev-clean`

## docker で本番稼働を確認

`make up` は本番稼働を想定し、ビルドして起動します。**データはホストの `~/.meshi` に永続化**されます（bind mount）。

```bash
make up     # ビルドして起動（web=5250 / server=5251, ~/.meshi に永続化）
make logs   # ログ表示
make down   # 停止 & container削除（~/.meshi のデータはホストに保持）
```

> 注: `make dev`（web=5350 / server=5351 / データ=`~/.meshi-dev`）と
> `make up`（web=5250 / server=5251 / データ=`~/.meshi`）はポートもデータも別です。
> ただし `make up` は実データ `~/.meshi` を直接使うため、`make dev` と同時起動する場合でも
> データ整合の観点では別DBになる点に留意してください。

## リリース（npm 公開）

GitHub Actions の `Release` workflow を手動実行することで、`@minimalcorp/meshi` を npm に公開します。

1. GitHub の Actions タブから `Release` workflow を選択
2. **version**（`patch` / `minor` / `major`）を入力して Run
3. `production-release` Environment の承認待ちになるので、承認画面で main の最新状態を確認して承認
4. 承認後、自動で version bump → tag push → `npm publish`（prepack で web+server を bundle）→ GitHub Release 作成

詳細は [.github/workflows/release.yml](.github/workflows/release.yml) を参照。

### 初回実行前の必須セットアップ

初めて `Release` workflow を実行する前に、以下を手動で設定しておく必要があります。

1. **npm Organization 準備**
   - npmjs.com で `@minimalcorp` organization を作成（未作成の場合）
   - `@minimalcorp/meshi` パッケージ名が未取得であることを確認

2. **npm Trusted Publisher を事前登録**（npm 側）
   - 本 workflow は **npm Trusted Publishing (OIDC)** を使用するため `NPM_TOKEN` は不要
   - npmjs.com で Trusted Publisher を追加: organization=`minimalcorp`, repository=`meshi`, workflow=`release.yml`, environment=`production-release`
   - **パッケージがまだ存在しない段階でも "Pending Trusted Publisher" として事前登録可能** → 初回 publish も workflow から実行でき、**手元での `npm publish` は不要**

3. **`production-release` Environment の作成と承認者設定**（必須）
   - Settings → Environments → `New environment` → 名前を `production-release` として作成
   - **Required reviewers** を有効化し、リリース承認権限を持つメンバー（自分自身でも可）を追加
   - Release workflow の `approve` job はこの Environment 配下で実行されるため、実行時に GitHub UI で明示的な承認操作が必要になる

4. **`main` ブランチ保護の bypass 設定**（保護ルールを設定している場合）
   - `Release` workflow は `npm version` で bump した commit と tag を `main` に直接 push する
   - 保護ルールがある場合、`github-actions[bot]` は user role を持たないため Bypass list に明示設定が必要:
     - 独立した **Deploy key** を発行 → public key を Deploy keys に登録（write access）→ private key を `RELEASE_DEPLOY_KEY` secret に登録 → main ruleset の Bypass list に追加（推奨）
   - 保護ルールを main に設定していない場合は不要

これらを設定せずに workflow を実行すると、途中で失敗してバージョン番号だけが bump された中途半端な状態になる可能性があるので、**必ず事前に設定してください**。

> **「初回 publish は手元で」について**: 以前のトークン方式では新規パッケージの初回公開を手元で行う必要がありましたが、現在は npm Trusted Publishing の "Pending Trusted Publisher" 事前登録により**初回から workflow 経由で公開できます**（手元 publish は不要）。

## リポジトリ構成

```
meshi/
├── apps/
│   ├── web/                  # @meshi/web    (Next.js UI, private)
│   ├── server/               # @meshi/server (Fastify + Prisma, private)
│   └── cli/                  # @minimalcorp/meshi (公開パッケージ / npx 起動)
├── .github/workflows/
│   ├── ci.yml                # PR CI (format / lint / type-check / build)
│   └── release.yml           # npm publish (Trusted Publishing + 承認ゲート)
├── docker/                   # docker 稼働 (make up)
├── LICENSE                   # PolyForm Shield 1.0.0
└── package.json              # monorepo root (workspaces)
```

## ドキュメント

- [開発計画](docs/development-plan.md)
- [開発メモ（不明点・判断ログ）](docs/dev-notes.md)
