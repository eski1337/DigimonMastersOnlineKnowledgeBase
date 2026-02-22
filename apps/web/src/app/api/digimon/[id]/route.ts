import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

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
    // Check authentication
    const session = await getServerSession(authOptions);
    
    console.log('Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email,
      role: session?.user?.role,
      name: session?.user?.name,
    });
    
    if (!session?.user) {
      console.error('No session or user found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    if (!hasEditPermission(session.user.role)) {
      console.error('Permission denied. User role:', session.user.role, 'Required: owner, admin, or editor');
      return NextResponse.json(
        { error: 'Forbidden - Only Owner, Admin, and Editor roles can edit', role: session.user.role },
        { status: 403 }
      );
    }
    
    console.log('✅ Authentication passed for user:', session.user.email, 'role:', session.user.role);

    // Get the request body
    const body = await request.json();

    // Check if credentials are available
    const adminEmail = process.env.CMS_ADMIN_EMAIL;
    const adminPassword = process.env.CMS_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error('CMS credentials not found in environment');
      return NextResponse.json(
        { error: 'Server configuration error - CMS credentials missing' },
        { status: 500 }
      );
    }

    console.log('Attempting CMS login with email:', adminEmail);

    // Login to CMS to get authenticated cookie
    const loginResponse = await fetch(`${CMS_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (!loginResponse.ok) {
      const loginError = await loginResponse.json().catch(() => ({ message: 'Unknown error' }));
      console.error('CMS login failed:', loginResponse.status, loginError);
      return NextResponse.json(
        { error: 'Failed to authenticate with CMS', details: loginError },
        { status: 500 }
      );
    }

    // Extract cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');

    // Forward the authenticated request to CMS
    const response = await fetch(`${CMS_URL}/api/digimon/${params.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { 'Cookie': cookies } : {}),
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
