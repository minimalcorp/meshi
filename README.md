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

## docker で一時的に確認

```bash
make up     # ビルドして起動
make logs   # ログ表示
make down   # 停止（データは ~/.meshi に保持）
make down-v # 停止 + volume 削除（完全リセット）
```

## ドキュメント

- [開発計画](docs/development-plan.md)
- [開発メモ（不明点・判断ログ）](docs/dev-notes.md)
