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

## ⚠️ 検証時の鉄則（重要・インシデント反省）

- **テストは必ず隔離する**。`~/.meshi`（ユーザーの実データ）を使わない・消さない。
  - `MESHI_DATA_DIR=<scratch>` を指定し、ポートも既定(5250/5251)を避ける（例: 5266/5267）。
  - ユーザーが `make dev` でアプリを起動している可能性があるため、既定ポートへの curl は
    実サーバ＝実データに書き込むことになる。必ずポートとデータディレクトリを分離する。
  - 2026-06-28: 上記を怠り、テストの `rm ~/.meshi/...` と既定ポートへの curl でユーザーの
    起動中DBを破壊・汚染した。再発防止としてこの節を厳守する。

## 複数食品のまとめ記録（2026-06-28 追加）

- `POST /api/records/batch` で複数 IntakeRecord をトランザクション一括作成（1食品=1記録を維持）。
- Web ホームは「バスケット方式」: 食品を複数追加 → 共通の区分・摂取日時で「まとめて記録」。
- マスタ／アドホックを混在して1食として登録可能（例: 米 + サバ缶 を昼食）。

## その他の決定事項（情報共有）

- **時刻はマシンのローカルタイムゾーン基準**で集計・表示（server/browser が同一マシン前提）。
- **server は本番(docker)でも tsx で TS を直接実行**（tsc ビルドはせず、Prisma生成物の同梱問題を回避）。ローカルツール用途として簡素化。
- **visx グラフは build・データ経路で検証済みだが、ブラウザでの見た目は未目視**。`make dev` で確認推奨。
- テストコードは未整備（土台フェーズのスコープ外と判断）。
