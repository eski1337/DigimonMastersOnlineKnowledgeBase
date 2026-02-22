import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SessionProvider } from '@/components/providers/session-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'DMO KB - Digimon Masters Online Knowledge Base',
  description:
    'A comprehensive, modern knowledge base for Digimon Masters Online. Find Digimon stats, quests, guides, tools, and more.',
  keywords: [
    'Digimon Masters Online',
    'DMO',
    'Digimon',
    'Knowledge Base',
    'Wiki',
    'Database',
    'Guides',
    'Tools',
  ],
  authors: [{ name: 'DMO KB Community' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://dmokb.local',
    siteName: 'DMO KB',
    title: 'DMO KB - Digimon Masters Online Knowledge Base',
    description: 'Comprehensive DMO knowledge base with Digimon stats, quests, and guides.',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
