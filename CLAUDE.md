# CLAUDE.md

このリポジトリで作業する際のメモ。

## 開発の起動

- `make dev` で docker 上に server(Fastify) / web(Next.js) / docs をホットリロード起動する（`docker/compose.dev.yml`）。
- 公開エントリは Fastify(コンテナ内 5250) で、ホスト `http://localhost:6250` に公開。API 以外は内部の Next.js(5251) へ proxy される。
- 開発データは使い捨ての bind mount `./.meshi-dev`（本番 `~/.meshi` とは無関係）。

## 依存パッケージを追加したときの注意（重要）

dev コンテナは `node_modules` を **anonymous volume**（`compose.dev.yml` の `/app/node_modules`, `/app/apps/*/node_modules`）で保持する。
この volume は最初にコンテナを作成したときのイメージ内容が残り続けるため、ホスト側で `package.json` / `package-lock.json` を更新しただけでは
コンテナ内に新しい依存が入らず、`Module not found: Can't resolve '...'` になる。

対処（いずれか）:

1. 稼働中コンテナへ直接インストール（最速・開発データを保持）

   ```sh
   docker compose -f docker/compose.dev.yml exec meshi-dev npm install <pkg> -w @meshi/web
   docker compose -f docker/compose.dev.yml restart meshi-dev   # Next dev の解決キャッシュを破棄するため再起動
   ```

2. node_modules volume を作り直す

   ```sh
   docker compose -f docker/compose.dev.yml down -v && make dev
   ```

   - `down -v` は anonymous volume を消すが、`./.meshi-dev` は bind mount なので残る。
   - `make dev-clean` は `down -v` に加えて `./.meshi-dev` も削除するので、開発データを残したいときは使わない。

## ローカルの型チェック / lint

- docker を使わずに型補完・型チェックしたい場合は `make install`（`NODE_ENV=development npm install --include=dev`）で依存を入れる。
- web 単体: `npm run type-check -w @meshi/web` / `npm run lint -w @meshi/web`。
