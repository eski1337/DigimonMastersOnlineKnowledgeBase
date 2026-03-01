import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

/**
 * GET /api/profile-comments?profileId=xxx&page=1&limit=20
 * Fetch comments for a user's profile wall.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    if (!profileId) {
      return NextResponse.json({ error: 'profileId required' }, { status: 400 });
    }

    const cmsParams = new URLSearchParams();
    cmsParams.append('where[profile][equals]', profileId);
    cmsParams.append('where[isHidden][not_equals]', 'true');
    cmsParams.append('where[parent][exists]', 'false'); // Only top-level comments
    cmsParams.append('sort', '-createdAt');
    cmsParams.append('depth', '2');
    cmsParams.append('page', page);
    cmsParams.append('limit', limit);

    const res = await fetch(`${CMS_URL}/api/profile-comments?${cmsParams.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[ProfileComments GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/profile-comments
 * Create a new profile comment. Body: { profileId, body, parentId? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profileId, body: commentBody, parentId } = body;

    if (!profileId || !commentBody?.trim()) {
      return NextResponse.json({ error: 'profileId and body required' }, { status: 400 });
    }

    if (commentBody.length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 });
    }

    // Check if user is blocked by profile owner
    const blockCheck = await fetch(
      `${CMS_URL}/api/user-blocks?where[blocker][equals]=${profileId}&where[blocked][equals]=${session.user.id}&limit=1`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (blockCheck.ok) {
      const blockData = await blockCheck.json();
      if (blockData.docs?.length > 0) {
        return NextResponse.json({ error: 'You cannot comment on this profile' }, { status: 403 });
      }
    }

    // Authenticate to CMS via cached admin token
    const token = await getCmsToken();

    const createData: Record<string, unknown> = {
      profile: profileId,
      author: session.user.id,
      body: commentBody.trim(),
    };
    if (parentId) {
      createData.parent = parentId;
    }

    const createRes = await fetch(`${CMS_URL}/api/profile-comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `JWT ${token}` } : {}),
      },
      body: JSON.stringify(createData),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      return NextResponse.json({ error: 'Failed to create comment', details: err }, { status: createRes.status });
    }

    const created = await createRes.json();

    // Send notification to profile owner (if commenter is not the profile owner)
    if (token && profileId !== session.user.id) {
      const commenterName = (session.user as any).username || session.user.name || 'Someone';
      fetch(`${CMS_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `JWT ${token}`,
        },
        body: JSON.stringify({
          recipient: profileId,
          type: parentId ? 'comment_reply' : 'profile_comment',
          title: parentId
            ? `${commenterName} replied to a comment on your profile`
            : `${commenterName} left a comment on your profile`,
          body: commentBody.trim().substring(0, 200),
          linkUrl: '/profile',
          fromUser: session.user.id,
        }),
      }).catch(() => {}); // Non-blocking, non-critical
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[ProfileComments POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
