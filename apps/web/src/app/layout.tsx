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
  title: {
    default: 'DMO Knowledge Base — Digimon Masters Online Wiki, Database & Guides',
    template: '%s — DMO Knowledge Base',
  },
  description:
    'The most comprehensive Digimon Masters Online (DMO) knowledge base. Digimon stats, digivolution charts, item database, maps, guides, patch notes & tools. Covers GDMO, KDMO, NADMO, TWDMO, HKDMO, THDMO & more.',
  keywords: [
    // Primary
    'Digimon Masters Online', 'DMO', 'DMO Wiki', 'DMO Database', 'DMO Knowledge Base',
    'DMO KB', 'DMOKB',
    // Regional server variants — what players actually search
    'GDMO', 'NADMO', 'KDMO', 'TWDMO', 'HKDMO', 'THDMO', 'TDMO',
    'Global DMO', 'Korea DMO', 'NA DMO', 'Taiwan DMO',
    // Alternative names / competitor keywords
    'DMOWiki', 'DMO Wiki', 'Digimon Masters Wiki', 'Digimon Masters Database',
    'Digimon Masters Guide', 'Digimon Online',
    // Content keywords
    'Digimon stats', 'Digimon digivolution', 'DMO digivolution chart',
    'DMO items', 'DMO maps', 'DMO guides', 'DMO patch notes',
    'DMO evolution line', 'DMO tier list', 'DMO best Digimon',
    'Digimon Masters builds', 'DMO beginner guide',
    // Franchise
    'Digimon', 'Digital Monsters',
  ],
  authors: [{ name: 'DMO KB Community' }],
  creator: 'DMO KB',
  publisher: 'DMO KB',
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
    siteName: 'DMO Knowledge Base',
    title: 'DMO Knowledge Base — Digimon Masters Online Wiki & Database',
    description:
      'Comprehensive Digimon Masters Online database. Digimon stats, digivolution trees, items, maps, guides & patch notes for GDMO, KDMO, NADMO and all servers.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DMO Knowledge Base — Digimon Masters Online',
    description:
      'The ultimate DMO wiki. Digimon stats, digivolution charts, items, maps & guides.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'WebSite',
                  '@id': `${process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info'}/#website`,
                  url: process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
                  name: 'DMO Knowledge Base',
                  alternateName: ['DMOKB', 'DMO KB', 'DMO Wiki', 'Digimon Masters Wiki', 'Digimon Masters Database'],
                  description: 'The most comprehensive Digimon Masters Online knowledge base. Covers GDMO, KDMO, NADMO, TWDMO, HKDMO, THDMO and all servers.',
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info'}/digimon?search={search_term_string}`,
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
                {
                  '@type': 'Organization',
                  '@id': `${process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info'}/#organization`,
                  name: 'DMO Knowledge Base',
                  alternateName: 'DMOKB',
                  url: process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
                  logo: {
                    '@type': 'ImageObject',
                    url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info'}/og-image.png`,
                  },
                },
              ],
            }),
          }}
        />
      </head>
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
