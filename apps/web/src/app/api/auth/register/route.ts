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

    const payload = {
      username: body.username,
      email: body.email,
      password: body.password,
      passwordConfirm: body.confirmPassword || body.password,
      name: body.name || body.username,
    };

    // Proxy registration to Payload CMS (server-to-server, no CORS needed)
    const response = await fetch(`${CMS_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('CMS returned non-JSON:', response.status, responseText.substring(0, 200));
      return Response.json(
        { message: 'Registration service error. Please try again.' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      // Forward Payload CMS error with better message
      const errors = data.errors;
      if (errors && Array.isArray(errors)) {
        const messages = errors.map((e: { message?: string; field?: string }) => {
          if (e.field) return `The following field is invalid: ${e.field}`;
          return e.message || 'Unknown error';
        });
        return Response.json({ message: messages.join('. '), errors }, { status: response.status });
      }
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
