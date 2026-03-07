'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function SystemsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Systems page error:', error);
  }, [error]);

  return (
    <div className="container flex items-center justify-center min-h-[60vh] py-8">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle>Failed to load systems</CardTitle>
          </div>
          <CardDescription>
            Something went wrong while loading game systems.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={reset} variant="default">Try again</Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">Go home</Button>
        </CardContent>
      </Card>
    </div>
  );
}
