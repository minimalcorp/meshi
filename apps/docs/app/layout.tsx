import { Head } from 'nextra/components';
import 'nextra-theme-docs/style.css';
import type { ReactNode } from 'react';

export const metadata = {
  metadataBase: new URL('https://minimalcorp.github.io/meshi/'),
  title: {
    default: 'meshi Docs',
    template: '%s | meshi',
  },
  description: '摂取カロリーを記録し、目標に対する進捗を可視化するローカルツール。',
};

// Next.js App Router の要請により app 配下に最低1つの root layout が必要。
// このレイアウトは <html> と <body> だけを返し、Nextra theme のレンダリングは
// app/(docs)/layout.tsx に委譲する。こうすることで /_not-found のような
// Nextra ページではない経路が theme Layout を通らず、prerender が落ちない。
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>{children}</body>
    </html>
  );
}
