# meshi をローカルで一時的に動作確認するためのイメージ
# server(Fastify, tsx実行) と web(Next.js) を1コンテナで起動する。
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

# web をビルド（ブラウザから叩く API URL をビルド時にインライン化）
ENV NEXT_PUBLIC_MESHI_API_URL=http://localhost:5251
RUN NODE_ENV=production npm run build -w @meshi/web

# データは named volume にマウントするディレクトリへ
ENV MESHI_DATA_DIR=/data

EXPOSE 5250 5251

CMD ["sh", "docker/start.sh"]
