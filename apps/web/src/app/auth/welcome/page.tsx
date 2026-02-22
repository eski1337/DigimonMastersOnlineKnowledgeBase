'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FaDiscord } from 'react-icons/fa';
import { CheckCircle, ArrowRight, X } from 'lucide-react';

const DISCORD_INVITE_URL = process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.gg/your-invite-code';
const DISCORD_SERVER_NAME = process.env.NEXT_PUBLIC_DISCORD_SERVER_NAME || 'DMO KB Community';

export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(10);
  const isNewUser = searchParams?.get('new') === 'true';

  useEffect(() => {
    // Redirect if not authenticated
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // Start countdown
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      // Auto-redirect after countdown
      router.push('/');
    }
  }, [status, countdown, router]);

  const handleJoinDiscord = () => {
    // Open Discord invite in new tab
    window.open(DISCORD_INVITE_URL, '_blank');
    // Redirect to home after a short delay
    setTimeout(() => router.push('/'), 1000);
  };

  const handleSkip = () => {
    router.push('/');
  };

  if (status === 'loading') {
    return (
      <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">
      <Card className="w-full max-w-2xl border-green-500/50 bg-gradient-to-br from-[#1d2021] to-[#282828]">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            <div className="bg-green-500/20 p-4 rounded-full">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            {isNewUser ? '🎉 Welcome to DMO KB!' : '✅ Successfully Signed In!'}
          </CardTitle>
          {session?.user && (
            <p className="text-lg text-muted-foreground">
              Hello, <span className="text-green-400 font-semibold">{session.user.name || session.user.email}</span>
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Discord Invitation */}
          <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <FaDiscord className="w-12 h-12 text-[#5865F2]" />
              <div>
                <h3 className="text-xl font-bold text-[#5865F2]">Join Our Discord Community!</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with other players, get updates, and participate in events
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Get exclusive news & updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Chat with the community</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Ask questions & get help</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Participate in events</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleJoinDiscord}
                  className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-lg py-6"
                  size="lg"
                >
                  <FaDiscord className="mr-2 h-5 w-5" />
                  Join {DISCORD_SERVER_NAME}
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                  size="lg"
                >
                  Maybe Later
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Opens in a new tab • You can join anytime from your profile
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-muted/30 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold">What's Next?</h3>
            <div className="space-y-3">
              <Link href="/digimon" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="bg-blue-500/20 p-2 rounded">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Browse Digimon Database</div>
                    <div className="text-sm text-muted-foreground">Explore all available Digimon</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>

              <Link href="/guides" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="bg-green-500/20 p-2 rounded">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Check Out Guides</div>
                    <div className="text-sm text-muted-foreground">Learn tips and strategies</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>

              <Link href="/" className="block">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="bg-purple-500/20 p-2 rounded">
                    <span className="text-2xl">🏠</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Go to Homepage</div>
                    <div className="text-sm text-muted-foreground">Start exploring DMO KB</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </div>

          {/* Auto-redirect notice */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Redirecting to homepage in <span className="font-bold text-blue-400">{countdown}</span> seconds...
            </p>
            <Button
              onClick={handleSkip}
              variant="ghost"
              size="sm"
              className="mt-2"
            >
              Skip waiting <X className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
