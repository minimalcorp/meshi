import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import { Banner } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import type { ReactNode } from 'react';

const banner = <Banner storageKey="meshi-banner-v1">meshi は現在活発に開発中です。</Banner>;

const navbar = <Navbar logo={<b>meshi</b>} projectLink="https://github.com/minimalcorp/meshi" />;

const footer = (
  <Footer>© {new Date().getFullYear()} minimalcorp. PolyForm Shield 1.0.0 ライセンス.</Footer>
);

// content ページ (MDX) だけをラップする Nextra theme レイアウト。
export default async function DocsLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap();
  return (
    <Layout
      banner={banner}
      navbar={navbar}
      footer={footer}
      docsRepositoryBase="https://github.com/minimalcorp/meshi/tree/main/apps/docs/content"
      pageMap={pageMap}
    >
      {children}
    </Layout>
  );
}
