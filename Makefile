COMPOSE := docker compose -f docker/compose.yml
DEV_COMPOSE := docker compose -f docker/compose.dev.yml
# 開発用は使い捨てのデータディレクトリ（実データ ~/.meshi を汚さない）
DEV_DATA_DIR := $(CURDIR)/.meshi-dev

.PHONY: help dev dev-logs dev-down dev-clean install up down logs ps

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# 開発（docker・ホットリロード。データは使い捨て ./.meshi-dev。本番 ~/.meshi とは無関係）
# ---------------------------------------------------------------------------
dev: ## docker で dev 起動 (web=5350 / server=5351 / docs=6260, HMR, データは ./.meshi-dev)
	$(DEV_COMPOSE) up --build

dev-logs: ## dev コンテナのログを follow 表示
	$(DEV_COMPOSE) logs -f

dev-down: ## dev コンテナ停止 & 削除（開発データ ./.meshi-dev は保持）
	$(DEV_COMPOSE) down

dev-clean: ## dev コンテナ & volume 破棄 + 開発データ (./.meshi-dev) 破棄
	$(DEV_COMPOSE) down -v
	rm -rf $(DEV_DATA_DIR)

# NOTE: 環境に NODE_ENV=production があると npm が devDeps を省略するため上書きする。
# ローカルの IDE 補完 / 型チェック用。dev 自体は docker 内で完結するため任意。
install: ## 依存インストール（任意・ローカル IDE 用）
	NODE_ENV=development npm install --include=dev

# ---------------------------------------------------------------------------
# docker による本番稼働想定の確認 (web+server のみ。データはホスト ~/.meshi に永続化)
# ---------------------------------------------------------------------------
up: ## docker で本番ビルド起動 (web=5250 / server=5251, ~/.meshi を bind mount)
	$(COMPOSE) up -d --build

down: ## docker 停止 & container削除 (~/.meshi のデータはホストに保持)
	$(COMPOSE) down

logs: ## docker ログを follow 表示
	$(COMPOSE) logs -f

ps: ## docker サービス状態表示
	$(COMPOSE) ps
