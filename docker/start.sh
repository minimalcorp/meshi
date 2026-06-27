#!/bin/sh
set -e

# データディレクトリを用意して migration を適用
mkdir -p "${MESHI_DATA_DIR:-/data}/state"
( cd /app/apps/server && npx prisma migrate deploy )

# server(tsx) と web(next start) を同時起動
exec npx concurrently -k -n server,web -c magenta,blue \
  "NODE_ENV=production npx tsx apps/server/src/index.ts" \
  "NODE_ENV=production npm run start -w @meshi/web"
