import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const { username } = params;

    // Fetch user by username (case-insensitive), fall back to name lookup
    let user = null;
    const token = await getCmsToken();
    const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) hdrs['Authorization'] = `JWT ${token}`;

    // 1. Try username exact match, then case-insensitive like
    for (const op of ['equals', 'like']) {
      const res = await fetch(
        `${CMS_URL}/api/users?where[username][${op}]=${encodeURIComponent(username)}&depth=1&limit=5`,
        { headers: hdrs, cache: 'no-store' }
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.docs?.length) {
        user = data.docs.find((u: any) => u.username?.toLowerCase() === username.toLowerCase()) || data.docs[0];
        break;
      }
    }

    // 2. Fall back to name lookup (display name)
    if (!user) {
      for (const op of ['equals', 'like']) {
        const res = await fetch(
          `${CMS_URL}/api/users?where[name][${op}]=${encodeURIComponent(username)}&depth=1&limit=5`,
          { headers: hdrs, cache: 'no-store' }
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (data.docs?.length) {
          user = data.docs.find((u: any) => u.name?.toLowerCase() === username.toLowerCase()) || data.docs[0];
          break;
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check profile visibility
    const visibility = user.profileVisibility || 'public';
    if (visibility === 'private' && (!session?.user || session.user.id !== user.id)) {
      // Allow admin/owner to view private profiles
      const viewerRole = (session?.user as any)?.role;
      if (!viewerRole || !['admin', 'owner'].includes(viewerRole)) {
        return NextResponse.json({
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          profileVisibility: 'private',
          isPrivate: true,
        });
      }
    }

    if (visibility === 'registered' && !session?.user) {
      return NextResponse.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        profileVisibility: 'registered',
        isRestricted: true,
      });
    }

    // Strip sensitive fields
    const safeUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      banner: user.banner,
      bio: user.bio,
      location: user.location,
      socialLinks: user.socialLinks,
      profileVisibility: user.profileVisibility,
      allowMessages: user.allowMessages,
      allowProfileComments: user.allowProfileComments,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
    };

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('[User Profile API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
