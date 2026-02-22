import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Palette, Shield, Database } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | DMO Knowledge Base',
  description: 'Manage your account settings and preferences',
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin?callbackUrl=/settings');
  }

  const user = session.user;
  const role = user.roles?.[0] || 'guest';

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Account Settings</CardTitle>
            </div>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">
                Your email is managed through your authentication provider
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <p className="text-sm text-muted-foreground">{user?.name || 'Not set'}</p>
              <p className="text-xs text-muted-foreground">
                Update your name in the CMS admin panel
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <p className="text-sm text-muted-foreground capitalize">{role}</p>
              <p className="text-xs text-muted-foreground">
                Contact an administrator to change your role
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Email Notifications</label>
                  <p className="text-xs text-muted-foreground">
                    Receive email updates about new content
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Content Updates</label>
                  <p className="text-xs text-muted-foreground">
                    Get notified about patch notes and guides
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize how the site looks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Theme</label>
                  <p className="text-xs text-muted-foreground">
                    Currently using Gruvbox Dark theme
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">Coming soon</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Data & Privacy</CardTitle>
            </div>
            <CardDescription>Manage your data and privacy settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                Your data is stored securely and only used to provide you with a better experience.
              </p>
              <p className="text-sm text-muted-foreground">
                We do not share your personal information with third parties.
              </p>
            </div>
            
            <div className="pt-4 border-t space-y-2">
              <p className="text-sm font-medium text-destructive">Danger Zone</p>
              <p className="text-sm text-muted-foreground">
                To delete your account, please contact an administrator.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CMS Link for Editors */}
        {(role === 'owner' || role === 'admin' || role === 'editor') && (
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Advanced settings available in the CMS</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">
                For more advanced account settings and content management options, visit the CMS admin panel.
              </p>
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
      </div>
    </div>
  );
}
