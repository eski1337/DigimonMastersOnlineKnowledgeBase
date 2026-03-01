import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

/**
 * GET /api/conversations?page=1&limit=20
 * Fetch the current user's conversation inbox, sorted by most recent message.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const token = await getCmsToken();

    const cmsParams = new URLSearchParams();
    cmsParams.append('where[participants.user][equals]', session.user.id);
    cmsParams.append('sort', '-lastMessageAt');
    cmsParams.append('depth', '1');
    cmsParams.append('page', page);
    cmsParams.append('limit', limit);

    const res = await fetch(`${CMS_URL}/api/conversations?${cmsParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `JWT ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: res.status });
    }

    const data = await res.json();

    // Filter out conversations soft-deleted by this user
    if (data.docs) {
      data.docs = data.docs.filter((conv: any) => {
        const myParticipant = conv.participants?.find(
          (p: any) => (typeof p.user === 'object' ? p.user?.id : p.user) === session.user.id
        );
        return !myParticipant?.deletedAt;
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[Conversations GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
