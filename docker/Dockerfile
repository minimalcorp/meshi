# meshi をローカルで一時的に動作確認するためのイメージ
# Fastify(公開:5250) を単一エントリにし、API 以外を内部 Next.js(5251) へ proxy する。
# 1コンテナで両プロセスを起動する。
FROM node:24-slim

# prisma/libsql などのネイティブ依存に必要
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# devDependencies も必要（next build / tsx / prisma CLI）。
# ホスト環境の NODE_ENV=production に引きずられないよう明示する。
ENV NODE_ENV=development

# 依存インストール（ワークスペースの package.json を先に置いてキャッシュを効かせる）
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --include=dev

# ソースをコピー（node_modules は .dockerignore で除外 → コンテナ内の linux 向けバイナリを保持）
COPY . .

# Prisma クライアント生成
RUN npm run db:generate -w @meshi/server

# web をビルド。API は Fastify が同一オリジンで配信するため URL は相対（空）で焼き込む。
ENV NEXT_PUBLIC_MESHI_API_URL=
RUN NODE_ENV=production npm run build -w @meshi/web

# データは named volume にマウントするディレクトリへ
ENV MESHI_DATA_DIR=/data

# 5250: 公開する Fastify エントリ / 5251: 内部 Next.js（proxy 先）
EXPOSE 5250 5251

CMD ["sh", "docker/start.sh"]
