'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search } from 'lucide-react';
import Link from 'next/link';

export default function DigimonError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Digimon page error:', error);
  }, [error]);

  return (
    <div className="container py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Failed to Load Digimon</CardTitle>
          <CardDescription>
            We encountered an error while loading the Digimon data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-muted rounded-md">
              <p className="text-sm font-mono text-destructive">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={reset}>
              Try again
            </Button>
            <Button asChild variant="outline">
              <Link href="/digimon">
                <Search className="h-4 w-4 mr-2" />
                Browse all Digimon
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
