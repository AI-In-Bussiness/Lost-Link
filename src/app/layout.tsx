import type { Metadata } from 'next';
import { connection } from 'next/server';
import './globals.css';
import '@/interface/styles.css';
export const metadata: Metadata = { title: 'LostLink', description: 'Find a possible match. Prove it is yours. Get it back safely.' };
export default async function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
 // Every document needs request-time rendering for its fresh CSP nonce.
 await connection();
 return <html lang="en"><body>{children}</body></html>;
}
