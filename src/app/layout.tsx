import type { Metadata } from 'next';
import './globals.css';
import '@/interface/styles.css';
export const metadata: Metadata = { title: 'LostLink', description: 'Find a possible match. Prove it is yours. Get it back safely.' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
 return <html lang="en"><body>{children}</body></html>;
}
