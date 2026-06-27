# meshi 開発計画（土台フェーズ）

摂取カロリーを記録し、目標に対する進捗を日次・週次・月次で可視化／グラフ化するローカルツール。
本ドキュメントは「土台（基盤）を作る」ためのフェーズ別開発計画。

> **進捗: Phase 0〜6 すべて完了（2026-06-28）。** 各フェーズを個別コミット済み。
> 判断・スキップ項目は [dev-notes.md](dev-notes.md) を参照。

## 1. 決定事項（前提）

| 項目           | 決定                                                                            | 補足                                                                                          |
| -------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| アーキテクチャ | **web + server 分離**（npm workspaces）                                         | tsunagi に倣い `apps/web`(Next.js) と `apps/server`(API + Prisma) を分離。cli/docs は作らない |
| 記録方法       | **食品マスタ + 選択**                                                           | 食品マスタを登録しておき、記録時に選択。マスタ管理機能も土台に含める                          |
| 目標設定       | **期間ごとに変更可能**                                                          | `effectiveFrom` を持つ目標履歴。各日はその日時点で有効な目標で評価                            |
| 記録項目       | 食品名 / カロリー / 作成日時(createdAt) / 摂取日時(consumedAt) / 区分(mealType) | PFC等の栄養素は対象外                                                                         |
| 実行形態       | ローカル実行。DBは `~/.meshi` に永続化                                          | docker で一時的な動作確認も可能にする                                                         |

## 2. 技術スタック

- **モノレポ**: npm workspaces（`apps/*`）
- **web**: Next.js (App Router) + TypeScript + Tailwind
- **server**: Fastify + TypeScript（tsunagi 同様）
- **DB**: SQLite。データファイルは `~/.meshi/state/meshi.db`（`MESHI_DATA_DIR` で上書き可）
- **ORM**: Prisma（schema + migration 管理、`prisma.config.ts` でDBパスをホームディレクトリへ）
- **グラフ**: visx（Airbnb / `@visx/*`。D3ベースの低レベルReactプリミティブで柔軟なグラフ構築）
- **docker**: `docker/compose.yml` + Makefile で一時的な確認環境

> ポートは web=5250 / server=5251 を既定（環境変数で変更可）。

## 3. データモデル（Prisma schema 草案）

```prisma
// 食品マスタ
model Food {
  id            String   @id @default(uuid())
  name          String
  caloriesPerServing Int   @map("calories_per_serving") // 1食/1単位あたりの基準kcal
  unitLabel     String?  @map("unit_label")             // 例: "1杯", "100g"（任意）
  archived      Boolean  @default(false)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt      @map("updated_at")
  records       IntakeRecord[]
  @@map("foods")
}

// 摂取記録
model IntakeRecord {
  id          String   @id @default(uuid())
  foodId      String?  @map("food_id")   // マスタ参照（マスタ削除時もスナップショットで残せるようnullable）
  name        String                     // 記録時点の食品名スナップショット
  calories    Int                        // 記録時点のkcal（数量倍も反映できる実値）
  mealType    String   @map("meal_type") // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  consumedAt  DateTime @map("consumed_at")
  createdAt   DateTime @default(now()) @map("created_at")
  food        Food?    @relation(fields: [foodId], references: [id])
  @@index([consumedAt])
  @@map("intake_records")
}

// 目標カロリー（期間ごとに変更可能な履歴）
model CalorieGoal {
  id            String   @id @default(uuid())
  dailyTarget   Int      @map("daily_target")    // kcal/日
  effectiveFrom DateTime @map("effective_from")  // この日から有効
  createdAt     DateTime @default(now()) @map("created_at")
  @@index([effectiveFrom])
  @@map("calorie_goals")
}
```

**目標評価ロジック**: ある日 D の目標 = `effectiveFrom <= D` の最新 `CalorieGoal`。
週次／月次目標は「各日の有効目標の合計」で算出（期間途中で目標が変わっても正しく集計できる）。

## 4. API 設計（server / Fastify）草案

| メソッド     | パス                                                   | 用途                                       |
| ------------ | ------------------------------------------------------ | ------------------------------------------ |
| GET/POST     | `/api/foods`                                           | 食品マスタ一覧 / 追加                      |
| PATCH/DELETE | `/api/foods/:id`                                       | 編集 / アーカイブ                          |
| GET/POST     | `/api/records`                                         | 摂取記録一覧(期間フィルタ) / 追加          |
| PATCH/DELETE | `/api/records/:id`                                     | 編集 / 削除                                |
| GET/POST     | `/api/goals`                                           | 目標履歴一覧 / 追加                        |
| GET          | `/api/summary?period=day\|week\|month&date=YYYY-MM-DD` | 期間集計（摂取合計・目標・差分・日別内訳） |

## 5. フェーズ別計画

### Phase 0: モノレポ土台

- ルート `package.json`（workspaces: `apps/*`）、`.gitignore`、`.prettierrc`、`tsconfig` ベース
- `Makefile`（dev / docker 用ターゲット）、`README.md`
- **完了条件**: `npm install` が通り、空の web/server が起動できる骨組み

### Phase 1: server + DB 基盤

- `apps/server`: Fastify セットアップ、CORS
- Prisma 導入: `schema.prisma`（§3）、`prisma.config.ts`（DBを `~/.meshi/state/meshi.db` へ）
- 初回 migration 生成、`dev:migrate`（`prisma migrate deploy` + generate）スクリプト
- データディレクトリ解決ユーティリティ（`MESHI_DATA_DIR` 対応）
- **完了条件**: `npm run dev -w server` でDBが `~/.meshi` に作られ、ヘルスチェックAPIが応答

### Phase 2: CRUD API

- foods / records / goals の CRUD エンドポイント（§4）
- バリデーション、エラーハンドリング
- **完了条件**: curl で各リソースの作成・取得・更新・削除が一通り動作

### Phase 3: web 基盤 + 記録UI

- `apps/web`: Next.js + Tailwind セットアップ、APIクライアント（server叩く）
- 画面: ①記録入力（食品マスタから選択 + 区分 + 摂取日時）②記録一覧 ③食品マスタ管理
- **完了条件**: ブラウザから記録の追加／一覧／マスタ登録ができる

### Phase 4: 目標設定 + 進捗可視化

- 目標設定UI（新しい目標を `effectiveFrom` 付きで登録）
- `/api/summary` 実装 + ダッシュボード（日次・週次・月次の摂取/目標/差分、達成率バー）
- **完了条件**: 目標に対する日次・週次・月次進捗が数値で可視化される

### Phase 5: グラフ化

- visx（`@visx/*`）で日別摂取カロリー推移（目標ライン重ね表示）、週次・月次切替
- **完了条件**: 期間を選んでカロリー推移グラフが表示できる

### Phase 6: docker による一時確認

- `docker/Dockerfile` + `docker/compose.yml`、Makefile の `up/down/logs`
- `~/.meshi` を volume マウントしてローカルと同じデータで確認可能に
- **完了条件**: `make up` で web/server が立ち上がり、ブラウザで確認できる

## 6. ディレクトリ構成（完成イメージ）

```
meshi/
├── apps/
│   ├── web/                 # Next.js (UI)
│   │   └── src/app/...
│   └── server/              # Fastify + Prisma
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── prisma.config.ts
│       └── src/
│           ├── index.ts
│           ├── routes/
│           └── lib/data-path.ts
├── docker/
│   ├── Dockerfile
│   └── compose.yml
├── docs/development-plan.md  # 本書
├── Makefile
├── package.json             # workspaces
└── README.md
```

## 7. スコープ外（土台では作らない）

- 外部食品DB連携 / 食品の自動カロリー取得
- PFC等の栄養素管理
- 認証・マルチユーザー（ローカル単一ユーザー前提）
- npm 公開 / CLI 配布

```

```
