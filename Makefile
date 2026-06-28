COMPOSE := docker compose -f docker/compose.yml
# 開発用は使い捨てのデータディレクトリ（実データ ~/.meshi を汚さない）
DEV_DATA_DIR := $(CURDIR)/.meshi-dev

.PHONY: help dev dev-clean install up down logs ps

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# ローカル開発（データは使い捨て: ./.meshi-dev。破棄して問題ない）
# ---------------------------------------------------------------------------
# NOTE: 環境に NODE_ENV=production があると npm が devDeps を省略するため上書きする
install: ## 依存インストール
	NODE_ENV=development npm install --include=dev

dev: ## web + server を同時起動 (ローカル, データは ./.meshi-dev に隔離)
	NODE_ENV=development MESHI_DATA_DIR=$(DEV_DATA_DIR) npm run dev

dev-clean: ## 開発用データ (./.meshi-dev) を破棄
	rm -rf $(DEV_DATA_DIR)

# ---------------------------------------------------------------------------
# docker による本番稼働想定の確認 (データはホスト ~/.meshi に永続化)
# ---------------------------------------------------------------------------
up: ## docker で起動 (web=5250 / server=5251, ~/.meshi を bind mount)
	$(COMPOSE) up -d --build

down: ## docker 停止 & container削除 (~/.meshi のデータはホストに保持)
	$(COMPOSE) down

logs: ## docker ログを follow 表示
	$(COMPOSE) logs -f

ps: ## docker サービス状態表示
	$(COMPOSE) ps
