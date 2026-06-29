#!/bin/sh
set -e

# ポート: Fastify(公開) 5250 / 内部 Next.js 5251。
# Fastify は MESHI_WEB_PORT を proxy 先として参照し、web(next start) は同じ値で待ち受ける。
export MESHI_SERVER_PORT=5250
export MESHI_WEB_PORT=5251

# データディレクトリを用意して migration を適用
mkdir -p "${MESHI_DATA_DIR:-/data}/state"
( cd /app/apps/server && npx prisma migrate deploy )

# server(tsx) と web(next start) を同時起動
exec npx concurrently -k -n server,web -c magenta,blue \
  "NODE_ENV=production npx tsx apps/server/src/index.ts" \
  "NODE_ENV=production npm run start -w @meshi/web"
