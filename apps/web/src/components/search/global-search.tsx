'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';

interface SearchResult {
  type: 'digimon' | 'guide' | 'quest' | 'map' | 'tool';
  id: string;
  title: string;
  slug: string;
  description?: string;
  image?: string;
  metadata?: Record<string, unknown>;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        performSearch(query);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
      
      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getResultUrl = (result: SearchResult) => {
    switch (result.type) {
      case 'digimon':
        return `/digimon/${result.slug}`;
      case 'guide':
        return `/guides/${result.slug}`;
      case 'quest':
        return `/quests/${result.slug}`;
      case 'map':
        return `/maps/${result.slug}`;
      case 'tool':
        return `/tools/${result.slug}`;
      default:
        return '/';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'digimon':
        return 'bg-gruvbox-yellow text-black';
      case 'guide':
        return 'bg-gruvbox-green text-black';
      case 'quest':
        return 'bg-gruvbox-blue text-black';
      case 'map':
        return 'bg-gruvbox-purple text-black';
      case 'tool':
        return 'bg-gruvbox-orange text-black';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          id="global-search-input"
          type="search"
          placeholder="Search... (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <Card className="absolute z-50 mt-2 w-full max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            <div className="space-y-1">
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={getResultUrl(result)}
                  onClick={() => {
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="block"
                >
                  <div className="flex items-start gap-3 p-2 rounded hover:bg-muted transition-colors">
                    {result.image && (
                      <div className="relative w-12 h-12 flex-shrink-0 bg-muted rounded overflow-hidden">
                        <Image
                          src={result.image}
                          alt={result.title}
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getTypeColor(result.type)}>
                          {result.type}
                        </Badge>
                        <span className="font-semibold text-sm truncate">
                          {result.title}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </p>
                      )}
                      {result.metadata && (
                        <div className="flex gap-2 mt-1">
                          {Object.entries(result.metadata).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <Card className="absolute z-50 mt-2 w-full">
          <CardContent className="p-4 text-center text-muted-foreground">
            No results found for "{query}"
          </CardContent>
        </Card>
      )}
    </div>
  );
}
