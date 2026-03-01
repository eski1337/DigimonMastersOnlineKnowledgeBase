import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { SessionProvider } from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { ScrollToTop } from '@/components/common/scroll-to-top';
import { HeroBackground } from '@/components/home/hero-background';

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
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
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
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <SessionProvider>
          <div className="relative flex min-h-screen flex-col">
            <div className="fixed inset-0 pointer-events-none z-0">
              <HeroBackground />
            </div>
            <Header />
            <main className="relative z-10 flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
          <ScrollToTop />
        </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
