import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: 'LostLink', description: 'Find a possible match. Prove it is yours. Get it back safely.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body><a href="#main" className="sr-only focus:not-sr-only">Skip to content</a><header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6"><Link href="/" className="text-xl font-bold no-underline">LostLink</Link><nav aria-label="Main"><Link href="/sign-in">Sign in</Link></nav></header>{children}<footer className="mx-auto max-w-5xl px-6 py-10 text-sm text-slate-600">LostLink · Competition development · Fictional demo data only</footer></body></html>;
}
