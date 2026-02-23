'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegistrationError {
  field?: string;
  message: string;
}

interface ErrorResponse {
  message?: string;
  errors?: RegistrationError[];
}

// Registration goes through our own API proxy to avoid CORS issues

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.username) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (formData.username.length < 3 || formData.username.length > 20) {
      setError('Username must be between 3 and 20 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // Register user with Payload CMS
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          name: formData.name || formData.username,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Registration failed:', data);
        
        const errorData = data as ErrorResponse;
        const msg = errorData.message || '';
        
        // Check common error patterns
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique')) {
          setError('This email is already registered. Please sign in instead.');
        } else if (msg) {
          setError(msg);
        } else if (errorData.errors) {
          const errorMsg = errorData.errors.map((e) => e.message).join(', ');
          setError(errorMsg || 'Registration failed. Please try again.');
        } else {
          setError('Registration failed. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Registration successful, now sign in
      setSuccess(true);
      
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Registration successful, but auto-login failed. Please sign in manually.');
        setTimeout(() => router.push('/auth/signin'), 2000);
      } else {
        // Successfully registered and logged in - redirect to welcome page
        setTimeout(() => router.push('/auth/welcome?new=true'), 1500);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscordRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Discord OAuth automatically creates a user with member role
      // New users will be redirected to welcome page
      await signIn('discord', { 
        callbackUrl: '/auth/welcome?new=true&from=discord' 
      });
    } catch (err) {
      setError('Failed to sign in with Discord. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Register to access exclusive features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
              <AlertDescription>
                <div>✅ Account created successfully!</div>
                <div className="mt-2 text-sm">
                  Logging you in...
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Email Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="username"
                value={formData.username}
                onChange={handleChange}
                disabled={isLoading || success}
                required
                minLength={3}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">Used for login (3-20 characters)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading || success}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name (Optional)</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading || success}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading || success}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading || success}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              Create Account
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or register with</span>
            </div>
          </div>

          {/* Discord Registration */}
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleDiscordRegister}
            disabled={isLoading || success}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <FaDiscord className="mr-2 h-5 w-5" />
            )}
            Continue with Discord
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300 font-semibold">
                Sign In
              </Link>
            </p>
            <p className="text-xs text-muted-foreground">
              New accounts start with Member permissions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
