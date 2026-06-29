import nextra from 'nextra';

const withNextra = nextra({
  // Nextra 4 のデフォルト構成。検索・シンタックスハイライト・MDX コンポーネントは
  // すべて標準で有効。
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages 配信のための静的 HTML エクスポート。
  output: 'export',
  // GitHub Pages の project page は https://<org>.github.io/<repo>/ という
  // サブパスで配信されるため、CI で NEXT_PUBLIC_BASE_PATH=/meshi を渡す。
  // ローカル開発時は未設定 (ルート配信) でよい。
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
  images: {
    // GitHub Pages では Next.js の画像最適化が使えない。
    unoptimized: true,
  },
  // 静的ホストでのディレクトリ風ルーティングを単純化する。
  trailingSlash: true,
};

export default withNextra(nextConfig);
