'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams?.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
      return;
    }

    // Verify the email
    const verifyEmail = async () => {
      try {
        const response = await fetch(`${CMS_URL}/api/users/verify/${token}`, {
          method: 'POST',
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! You can now sign in.');
          // Redirect to sign in after 3 seconds
          setTimeout(() => {
            router.push('/auth/signin');
          }, 3000);
        } else {
          const data = await response.json();
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Something went wrong. Please try again later.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'verifying' && (
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'verifying' && 'Verifying Email'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting to sign in page...
              </p>
              <Link href="/auth/signin">
                <Button className="w-full">
                  Go to Sign In
                </Button>
              </Link>
            </div>
          )}
          {status === 'error' && (
            <div className="space-y-3">
              <Link href="/auth/register">
                <Button variant="outline" className="w-full">
                  Register Again
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="ghost" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
