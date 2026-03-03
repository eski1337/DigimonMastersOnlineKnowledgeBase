'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GlobalSearch } from '@/components/search/global-search';
import { NotificationBell } from './notification-bell';
import { UserNav } from './user-nav';
import { MobileNav } from './mobile-nav';
import { ThemeToggle } from './theme-toggle';

const NAV_ITEMS = [
  { href: '/digimon', label: 'Digimon' },
  { href: '/guides', label: 'Guides' },
  { href: '/quests', label: 'Quests' },
  { href: '/maps', label: 'Maps' },
  { href: '/tools', label: 'Tools' },
  { href: '/patch-notes', label: 'Patch Notes' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">DMO KB</span>
          </Link>
        </div>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`transition-colors hover:text-foreground/80 ${
                  isActive ? 'text-foreground' : 'text-foreground/60'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="hidden md:block flex-1 max-w-sm">
            <GlobalSearch />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <UserNav />
          </div>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
