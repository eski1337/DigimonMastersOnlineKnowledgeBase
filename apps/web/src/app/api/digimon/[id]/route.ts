import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

// Helper to check edit permissions
function hasEditPermission(role?: string): boolean {
  if (!role) return false;
  return ['owner', 'admin', 'editor'].includes(role.toLowerCase());
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    if (!hasEditPermission(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Only Owner, Admin, and Editor roles can edit', role: session.user.role },
        { status: 403 }
      );
    }

    const body = await request.json();

    const token = await getCmsToken();
    if (!token) {
      return NextResponse.json(
        { error: 'CMS auth failed' },
        { status: 500 }
      );
    }

    const response = await fetch(`${CMS_URL}/api/digimon/${params.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to update', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
