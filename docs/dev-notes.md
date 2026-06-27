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

## 完了後にまとめて確認したい点（要回答）

1. **週の起点**: 週次集計を「月曜始まり」で実装した。日曜始まりが良ければ変更する。
2. **食品の削除挙動**: 「削除＝ハード削除（過去の記録は名前・kcalのスナップショットを保持し foodId は null）」
   とし、それとは別に「アーカイブ（一覧から隠す）」を PATCH で用意した。当初計画では DELETE=アーカイブだったが、
   両方あった方が運用しやすいと判断。この仕様で問題ないか。
3. **摂取記録の編集UI**: API には PATCH /api/records/:id を用意済みだが、Web画面では「追加＋削除」のみで
   インライン編集UIは未実装（土台では削除→再追加で代替）。インライン編集が必要か。
4. **ESLint**: 各 package.json に `lint` スクリプトはあるが、`eslint.config` は未作成（今は type-check + prettier が品質ゲート）。
   ESLint 設定を追加するか。

## その他の決定事項（情報共有）

- **時刻はマシンのローカルタイムゾーン基準**で集計・表示（server/browser が同一マシン前提）。
- **server は本番(docker)でも tsx で TS を直接実行**（tsc ビルドはせず、Prisma生成物の同梱問題を回避）。ローカルツール用途として簡素化。
- **visx グラフは build・データ経路で検証済みだが、ブラウザでの見た目は未目視**。`make dev` で確認推奨。
- テストコードは未整備（土台フェーズのスコープ外と判断）。
