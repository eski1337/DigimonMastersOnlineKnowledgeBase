import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
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

  // Redirect to the public profile page (preserve original casing)
  const username = (user as any).username || (user as any).name || user.id;
  redirect(`/user/${encodeURIComponent(username)}`);
}
