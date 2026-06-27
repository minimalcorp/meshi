COMPOSE := docker compose -f docker/compose.yml

.PHONY: help dev install up down down-v logs ps

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# ローカル開発
# ---------------------------------------------------------------------------
install: ## 依存インストール
	npm install

dev: ## web + server を同時起動 (ローカル)
	npm run dev

# ---------------------------------------------------------------------------
# docker による一時的な動作確認
# ---------------------------------------------------------------------------
up: ## docker で起動 (web=5250 / server=5251)
	$(COMPOSE) up -d --build

down: ## docker 停止 & container削除 (~/.meshi のデータは保持)
	$(COMPOSE) down

down-v: ## docker 停止 + volume削除 (完全リセット)
	$(COMPOSE) down -v

logs: ## docker ログを follow 表示
	$(COMPOSE) logs -f

ps: ## docker サービス状態表示
	$(COMPOSE) ps
