'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

export default function ResendVerificationPage() {
  const _router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch(`${CMS_URL}/api/users/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to send verification email. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="w-16 h-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Resend Verification Email</CardTitle>
          <CardDescription>
            Enter your email address to receive a new verification link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <Alert className="border-green-500 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="border-red-500 bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-500">
                {message}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleResend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || status === 'success'}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || status === 'success'}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-2 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Already verified?
            </p>
            <Link href="/auth/signin">
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
          </div>

          <div className="text-center">
            <Link href="/auth/register" className="text-sm text-muted-foreground hover:text-primary">
              Don't have an account? Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
