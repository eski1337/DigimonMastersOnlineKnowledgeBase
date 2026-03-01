'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Database, BookOpen, Scroll, Map, Wrench, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Dialog from '@radix-ui/react-dialog';
import { GlobalSearch } from '@/components/search/global-search';
import { NotificationBell } from './notification-bell';
import { UserNav } from './user-nav';
import { ThemeToggle } from './theme-toggle';

const NAV_ITEMS = [
  { href: '/digimon', label: 'Digimon', icon: Database },
  { href: '/guides', label: 'Guides', icon: BookOpen },
  { href: '/quests', label: 'Quests', icon: Scroll },
  { href: '/maps', label: 'Maps', icon: Map },
  { href: '/tools', label: 'Tools', icon: Wrench },
  { href: '/patch-notes', label: 'Patch Notes', icon: FileText },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-[280px] bg-background border-l shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b">
              <Link href="/" className="font-bold text-lg" onClick={() => setOpen(false)}>
                DMO KB
              </Link>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </Dialog.Close>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b">
              <GlobalSearch />
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-2">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-foreground/70 hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer: User actions */}
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <ThemeToggle />
              <NotificationBell />
              <UserNav />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
