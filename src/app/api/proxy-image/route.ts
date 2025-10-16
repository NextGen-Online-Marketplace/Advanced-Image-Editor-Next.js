// src/app/api/proxy-image/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  try {
    const normalizeUrl = (raw: string): string => {
      try {
        const u = new URL(raw);
        const host = u.hostname.toLowerCase();
        const isR2 = host.includes('r2.cloudflarestorage.com') || host.endsWith('.r2.dev') || host.includes('cloudflare') || host.includes('r2');
        if (isR2 && u.protocol === 'http:') u.protocol = 'https:';
        if (u.protocol === 'https:' && u.port === '80') u.port = '';
        if (u.protocol === 'http:' && u.port === '443') u.port = '';
        return u.toString();
      } catch {
        return raw;
      }
    };

    const targetUrl = normalizeUrl(imageUrl);

    // Fetch image from target
    let response: Response;
    try {
      response = await fetch(targetUrl);
    } catch (err: any) {
      const code = err?.cause?.code || err?.code;
      if (code === 'ERR_SSL_WRONG_VERSION_NUMBER') {
        console.error('⚠️ SSL handshake error (wrong version) for URL:', targetUrl);
        return NextResponse.json({ error: 'Upstream SSL handshake failed for the provided URL.' }, { status: 502 });
      }
      throw err;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // Return image with CORS headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}