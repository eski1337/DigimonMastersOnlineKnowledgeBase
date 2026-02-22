import Link from 'next/link';
import { Github, Twitter, MessageCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">DMO KB</h3>
            <p className="text-sm text-muted-foreground">
              A comprehensive knowledge base for Digimon Masters Online. Made by fans, for fans.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Content</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/digimon" className="text-muted-foreground hover:text-primary">
                  Digimon Database
                </Link>
              </li>
              <li>
                <Link href="/quests" className="text-muted-foreground hover:text-primary">
                  Quests
                </Link>
              </li>
              <li>
                <Link href="/guides" className="text-muted-foreground hover:text-primary">
                  Guides
                </Link>
              </li>
              <li>
                <Link href="/tools" className="text-muted-foreground hover:text-primary">
                  Tools & Trackers
                </Link>
              </li>
              <li>
                <Link href="/maps" className="text-muted-foreground hover:text-primary">
                  Maps
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contribute" className="text-muted-foreground hover:text-primary">
                  Contribute
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-muted-foreground hover:text-primary">
                  Changelog
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
                aria-label="Discord"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DMO KB. Community-driven project.</p>
          <p className="text-center md:text-right">
            Digimon Masters Online and all related content are property of their respective owners.
            This is a fan-made project.
          </p>
        </div>
      </div>
    </footer>
  );
}
