import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalSearch } from '@/components/search/global-search';
import { UserNav } from './user-nav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">DMO KB</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link
            href="/digimon"
            className="transition-colors hover:text-foreground/80 text-foreground"
          >
            Digimon
          </Link>
          <Link
            href="/guides"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Guides
          </Link>
          <Link
            href="/quests"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Quests
          </Link>
          <Link
            href="/maps"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Maps
          </Link>
          <Link
            href="/tools"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Tools
          </Link>
          <Link
            href="/patch-notes"
            className="transition-colors hover:text-foreground/80 text-foreground/60"
          >
            Patch Notes
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <div className="hidden md:block flex-1 max-w-sm">
            <GlobalSearch />
          </div>
          <div className="hidden md:flex items-center">
            <UserNav />
          </div>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
