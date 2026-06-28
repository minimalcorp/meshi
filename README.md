# meshi

摂取カロリーを記録し、目標に対する進捗を日次・週次・月次で可視化／グラフ化するローカルツール。

- 摂取カロリーを簡単に記録（食品マスタから選択）
- 目標摂取カロリーを登録（期間ごとに変更可能）
- 目標に対する進捗の可視化（日次・週次・月次）
- カロリー推移のグラフ化

## 技術構成

- **monorepo**: npm workspaces (`apps/*`)
- **web**: Next.js (App Router) + TypeScript + Tailwind … `http://localhost:5250`
- **server**: Fastify + Prisma … `http://localhost:5251`
- **DB**: SQLite（データは `~/.meshi/state/meshi.db` に永続化。`MESHI_DATA_DIR` で変更可）
- **グラフ**: visx (`@visx/*`)

## セットアップ / 起動

```bash
make install   # 依存インストール
make dev       # web + server を同時起動
```

- web: http://localhost:5250
- server: http://localhost:5251
- データは使い捨ての `./.meshi-dev` に保存（実データ `~/.meshi` とは分離）。破棄は `make dev-clean`

## docker で本番稼働を確認

`make up` は本番稼働を想定し、ビルドして起動します。**データはホストの `~/.meshi` に永続化**されます（bind mount）。

```bash
make up     # ビルドして起動（~/.meshi に永続化）
make logs   # ログ表示
make down   # 停止 & container削除（~/.meshi のデータはホストに保持）
```

> 注: `make dev`（=`~/.meshi-dev`）と `make up`（=`~/.meshi`）はデータが別です。
> `make up` は実データ `~/.meshi` を直接使うため、`make dev` と同時起動は避けてください
> （同一 SQLite ファイルへの競合回避のため、どちらか一方ずつ起動）。

## ドキュメント

- [開発計画](docs/development-plan.md)
- [開発メモ（不明点・判断ログ）](docs/dev-notes.md)
