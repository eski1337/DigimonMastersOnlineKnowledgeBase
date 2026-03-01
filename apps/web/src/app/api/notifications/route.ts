import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

/**
 * GET /api/notifications?page=1&limit=20&unreadOnly=true
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
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const token = await getCmsToken();

    const cmsParams = new URLSearchParams();
    cmsParams.append('where[recipient][equals]', session.user.id);
    if (unreadOnly) {
      cmsParams.append('where[isRead][equals]', 'false');
    }
    cmsParams.append('sort', '-createdAt');
    cmsParams.append('depth', '1');
    cmsParams.append('page', page);
    cmsParams.append('limit', limit);

    const res = await fetch(`${CMS_URL}/api/notifications?${cmsParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `JWT ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Notifications GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read. Body: { ids: string[] } or { markAllRead: true }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, markAllRead } = body;
    const token = await getCmsToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    };

    if (markAllRead) {
      // Fetch all unread notifications for this user
      const unreadRes = await fetch(
        `${CMS_URL}/api/notifications?where[recipient][equals]=${session.user.id}&where[isRead][equals]=false&limit=100&depth=0`,
        { headers }
      );
      if (unreadRes.ok) {
        const unreadData = await unreadRes.json();
        const updatePromises = (unreadData.docs || []).map((n: any) =>
          fetch(`${CMS_URL}/api/notifications/${n.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ isRead: true, readAt: new Date().toISOString() }),
          }).catch(() => {})
        );
        await Promise.all(updatePromises);
      }
      return NextResponse.json({ success: true });
    }

    if (ids && Array.isArray(ids)) {
      // Verify all IDs belong to this user before updating
      const verifyRes = await fetch(
        `${CMS_URL}/api/notifications?where[recipient][equals]=${session.user.id}&where[id][in]=${ids.join(',')}&limit=${ids.length}&depth=0`,
        { headers }
      );
      const ownedIds = new Set<string>();
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        for (const n of verifyData.docs || []) ownedIds.add(n.id);
      }
      const updatePromises = ids
        .filter((id: string) => ownedIds.has(id))
        .map((id: string) =>
          fetch(`${CMS_URL}/api/notifications/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ isRead: true, readAt: new Date().toISOString() }),
          }).catch(() => {})
        );
      await Promise.all(updatePromises);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'ids or markAllRead required' }, { status: 400 });
  } catch (error) {
    console.error('[Notifications PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
