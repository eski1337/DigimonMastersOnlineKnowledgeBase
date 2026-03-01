import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCmsToken } from '@/lib/cms-token';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !['admin', 'owner'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '50';
    const action = searchParams.get('action');
    const collection = searchParams.get('collection');
    const user = searchParams.get('user');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const token = await getCmsToken();
    if (!token) {
      return NextResponse.json({ error: 'CMS auth failed' }, { status: 500 });
    }

    // Build query
    const cmsParams = new URLSearchParams();
    cmsParams.append('page', page);
    cmsParams.append('limit', limit);
    cmsParams.append('sort', '-timestamp');
    cmsParams.append('depth', '1');

    if (action) cmsParams.append('where[action][equals]', action);
    if (collection) cmsParams.append('where[targetCollection][equals]', collection);
    if (user) cmsParams.append('where[userEmail][contains]', user);
    if (search) cmsParams.append('where[documentTitle][contains]', search);
    if (dateFrom) cmsParams.append('where[timestamp][greater_than_equal]', dateFrom);
    if (dateTo) cmsParams.append('where[timestamp][less_than_equal]', dateTo);

    const response = await fetch(`${CMS_URL}/api/audit-logs?${cmsParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: 'CMS query failed', details: err }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[AuditLogs API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
