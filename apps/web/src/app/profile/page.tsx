import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Shield, Calendar } from 'lucide-react';
import { FaDiscord } from 'react-icons/fa';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | DMO Knowledge Base',
  description: 'Your profile and account information',
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/profile');
  }

  const user = session.user;
  const role = user.roles?.[0] || 'guest';
  
  // Get initials for avatar fallback
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your personal details and role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user?.name || 'Anonymous User'}</h2>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Role</span>
                </div>
                <Badge variant={role === 'owner' || role === 'admin' ? 'default' : 'secondary'}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">User ID</span>
                </div>
                <span className="text-sm text-muted-foreground font-mono">{user?.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>What you can do on this site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {role === 'owner' && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Full system access - manage everything</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Manage users and roles</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Edit all content</span>
                  </div>
                </>
              )}
              {role === 'admin' && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Manage users and content</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Edit all content</span>
                  </div>
                </>
              )}
              {role === 'editor' && (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>Create and edit content</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span>Access CMS admin panel</span>
                  </div>
                </>
              )}
              {role === 'member' && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-gray-500" />
                  <span>View published content</span>
                </div>
              )}
              {role === 'guest' && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span>Limited access - view public content only</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CMS Access Card */}
        {(role === 'owner' || role === 'admin' || role === 'editor') && (
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Access the admin panel to manage content</CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={process.env.NEXT_PUBLIC_CMS_URL + '/admin'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Open CMS Admin Panel
              </a>
            </CardContent>
          </Card>
        )}

        {/* Discord Server Card */}
        <Card className="border-[#5865F2]/30 bg-gradient-to-br from-[#5865F2]/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-3">
              <FaDiscord className="h-8 w-8 text-[#5865F2]" />
              <div>
                <CardTitle className="text-[#5865F2]">Join Our Discord Community</CardTitle>
                <CardDescription>Connect with other players and stay updated</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Get exclusive news & updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Chat with the community</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Ask questions & get help</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Participate in events</span>
                </div>
              </div>
              <a
                href={process.env.NEXT_PUBLIC_DISCORD_INVITE || 'https://discord.gg/5hCYemcKVD'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#5865F2] text-white hover:bg-[#4752C4] h-10 px-4 py-2"
              >
                <FaDiscord className="h-5 w-5" />
                Join Discord Server
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
