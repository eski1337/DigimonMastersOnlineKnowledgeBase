import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function VerifyRequestPage() {
  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Check your email</CardTitle>
          <CardDescription className="text-center">
            We sent you a magic link to sign in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>A sign-in link has been sent to your email address.</p>
            <p>Click the link in the email to complete your sign-in.</p>
            <p className="text-xs">
              The link will expire in 24 hours for security reasons.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-xs text-center text-muted-foreground">
              Didn&apos;t receive the email?
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin">Try again</Link>
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              💡 Tip: Check your spam folder if you don&apos;t see the email
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
