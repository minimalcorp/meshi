# meshi 開発メモ（不明点・スキップ項目の記録）

開発計画(`development-plan.md`)に沿った実装中に発生した、判断・不明点・スキップ項目を記録する。
全フェーズ完了後にまとめてユーザーへ確認する。

## 判断ログ / 確認したい点

（実装の進行とともに追記）

- (Phase 0) Node 24.9.0 / npm 11.6.0 環境。ESM(`"type": "module"`)で統一。
- (Phase 3) **環境に `NODE_ENV=production` が設定済み**。このため `npm install` が devDependencies を
  インストール/prune してしまう（tailwindcss, prettier, typescript 等が入らない）。
  → 依存インストール時は `NODE_ENV=development npm install --include=dev` を使う必要がある。
  ※ユーザーのシェル設定由来。`make install` で吸収するか、ローカル開発時の運用ルールとして要確認。
- (Phase 3) UI は client component 中心（ブラウザ→server 直アクセス, CORS 有効）。SSR データ取得はしない。
  API のベースURLは `NEXT_PUBLIC_MESHI_API_URL`（既定 `http://localhost:5251`）。

## 完了後の確認事項（2026-06-28 回答反映済み）

1. **週の起点**: 「月曜始まり」で確定（現状維持）。
2. **食品の削除挙動**: → **アーカイブのみに変更**。サーバの `DELETE /api/foods/:id` は撤去し、
   一覧からの除外は `archived` フラグ（PATCH）で行う。Web も削除ボタンを撤去しアーカイブ/復活のみ。
3. **摂取記録の編集UI**: → **インライン編集を追加**。今日の記録一覧の各行に「編集」を追加し、
   食品名・kcal・区分・摂取日時をその場で編集（`RecordRow` コンポーネント、`PATCH /api/records/:id`）。
4. **ESLint**: → **追加**。web は next 用 flat config、server は typescript-eslint + prettier。
   `npm run lint` でグリーン。

## その他の決定事項（情報共有）

- **時刻はマシンのローカルタイムゾーン基準**で集計・表示（server/browser が同一マシン前提）。
- **server は本番(docker)でも tsx で TS を直接実行**（tsc ビルドはせず、Prisma生成物の同梱問題を回避）。ローカルツール用途として簡素化。
- **visx グラフは build・データ経路で検証済みだが、ブラウザでの見た目は未目視**。`make dev` で確認推奨。
- テストコードは未整備（土台フェーズのスコープ外と判断）。
