import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

/**
 * DELETE /api/profile-comments/[id]
 * Delete a profile comment. Only the comment author or admin/owner can delete.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
    }

    const token = await getCmsToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `JWT ${token}` } : {}),
    };

    // Fetch the comment to verify ownership
    const commentRes = await fetch(`${CMS_URL}/api/profile-comments/${id}?depth=0`, {
      headers,
    });

    if (!commentRes.ok) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const comment = await commentRes.json();
    const commentAuthorId = typeof comment.author === 'string' ? comment.author : comment.author?.id;

    // Only the author or admin/owner can delete
    const isAuthor = session.user.id === commentAuthorId;
    const isAdmin = ['admin', 'owner'].includes((session.user as any).role);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'You can only delete your own comments' }, { status: 403 });
    }

    // Delete via CMS
    const deleteRes = await fetch(`${CMS_URL}/api/profile-comments/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!deleteRes.ok) {
      const err = await deleteRes.text();
      return NextResponse.json({ error: 'Failed to delete comment', details: err }, { status: deleteRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ProfileComments DELETE] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
