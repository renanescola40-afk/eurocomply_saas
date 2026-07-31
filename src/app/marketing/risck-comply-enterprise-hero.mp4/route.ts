import type { NextRequest } from 'next/server';

const HERO_VIDEO_URL =
  'https://videos.pexels.com/video-files/6804109/6804109-uhd_4096_2160_25fps.mp4';

const CACHE_CONTROL =
  'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const range = request.headers.get('range');
  const upstream = await fetch(HERO_VIDEO_URL, {
    headers: range ? { Range: range } : undefined,
    cache: 'no-store',
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(null, { status: 502 });
  }

  const headers = new Headers({
    'Accept-Ranges': upstream.headers.get('accept-ranges') ?? 'bytes',
    'Cache-Control': CACHE_CONTROL,
    'Content-Type': upstream.headers.get('content-type') ?? 'video/mp4',
  });

  for (const name of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
