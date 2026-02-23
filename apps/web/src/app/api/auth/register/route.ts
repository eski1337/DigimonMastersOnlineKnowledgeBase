import { NextRequest } from 'next/server';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.username) {
      return Response.json(
        { message: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Proxy registration to Payload CMS (server-to-server, no CORS needed)
    const response = await fetch(`${CMS_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: body.username,
        email: body.email,
        password: body.password,
        passwordConfirm: body.confirmPassword || body.password,
        name: body.name || body.username,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('Registration proxy error:', error);
    return Response.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
