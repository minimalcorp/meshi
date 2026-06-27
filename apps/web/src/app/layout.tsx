import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'meshi — カロリー記録',
  description: '摂取カロリーを記録し、目標に対する進捗を可視化するツール',
};

const NAV = [
  { href: '/', label: 'ホーム' },
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/foods', label: '食品マスタ' },
  { href: '/goals', label: '目標' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="mx-auto max-w-3xl px-4 pb-16">
          <header className="flex items-center justify-between py-5">
            <Link href="/" className="text-xl font-bold tracking-tight">
              🍚 meshi
            </Link>
            <nav className="flex gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-md px-3 py-1.5 text-neutral-600 transition hover:bg-neutral-200 hover:text-neutral-900"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
