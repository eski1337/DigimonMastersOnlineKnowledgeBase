import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

/**
 * PATCH /api/users/[username]/profile
 * Update the current user's profile fields.
 * Only the profile owner can update their own profile.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = params;

    // Resolve the target user
    const token = await getCmsToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    };

    // Case-insensitive username lookup
    let targetUser = null;
    for (const op of ['equals', 'like']) {
      const lookupRes = await fetch(
        `${CMS_URL}/api/users?where[username][${op}]=${encodeURIComponent(username)}&limit=5&depth=0`,
        { headers }
      );
      if (!lookupRes.ok) continue;
      const lookupData = await lookupRes.json();
      if (lookupData.docs?.length) {
        targetUser = lookupData.docs.find((u: any) => u.username?.toLowerCase() === username.toLowerCase()) || lookupData.docs[0];
        break;
      }
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow editing own profile (or admin/owner override)
    const isOwner = session.user.id === targetUser.id;
    const isAdmin = ['admin', 'owner'].includes((session.user as any).role);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'You can only edit your own profile' }, { status: 403 });
    }

    const body = await request.json();

    // Whitelist allowed profile fields
    const allowedFields = [
      'name', 'bio', 'location',
      'socialLinks',
      'profileVisibility', 'allowMessages', 'allowProfileComments',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Validate lengths
    if (typeof updateData.bio === 'string' && updateData.bio.length > 500) {
      return NextResponse.json({ error: 'Bio too long (max 500 chars)' }, { status: 400 });
    }
    if (typeof updateData.location === 'string' && updateData.location.length > 100) {
      return NextResponse.json({ error: 'Location too long (max 100 chars)' }, { status: 400 });
    }
    if (typeof updateData.name === 'string' && updateData.name.length > 100) {
      return NextResponse.json({ error: 'Name too long (max 100 chars)' }, { status: 400 });
    }

    // Validate select fields
    const validVisibility = ['public', 'registered', 'private'];
    const validMessaging = ['everyone', 'registered', 'nobody'];
    if (updateData.profileVisibility && !validVisibility.includes(updateData.profileVisibility as string)) {
      return NextResponse.json({ error: 'Invalid profileVisibility value' }, { status: 400 });
    }
    if (updateData.allowMessages && !validMessaging.includes(updateData.allowMessages as string)) {
      return NextResponse.json({ error: 'Invalid allowMessages value' }, { status: 400 });
    }
    if (updateData.allowProfileComments && !validMessaging.includes(updateData.allowProfileComments as string)) {
      return NextResponse.json({ error: 'Invalid allowProfileComments value' }, { status: 400 });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update via CMS
    const updateRes = await fetch(`${CMS_URL}/api/users/${targetUser.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updateData),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return NextResponse.json({ error: 'Failed to update profile', details: err }, { status: updateRes.status });
    }

    const updated = await updateRes.json();
    return NextResponse.json({ success: true, user: updated.doc || updated });
  } catch (error) {
    console.error('[Profile Update] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
