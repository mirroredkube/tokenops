import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Missing verification code' }, { status: 400 });
    }

    // Forward the request to the backend with cookies
    const cookies = request.headers.get('cookie') || '';
    const response = await fetch(`${process.env.API_BASE || 'http://localhost:4000'}/auth/2fa/verify-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (response.ok) {
      // Set the auth cookie from the backend response
      const setCookieHeader = response.headers.get('Set-Cookie');
      const responseHeaders = new Headers();
      
      if (setCookieHeader) {
        responseHeaders.set('Set-Cookie', setCookieHeader);
      }
      
      return NextResponse.json(data, { 
        status: 200,
        headers: responseHeaders
      });
    } else {
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
