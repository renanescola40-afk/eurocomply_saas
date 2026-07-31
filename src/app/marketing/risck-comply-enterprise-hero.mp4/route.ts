import { NextResponse } from 'next/server';

const HERO_VIDEO_URL =
  'https://videos.pexels.com/video-files/6804109/6804109-uhd_4096_2160_25fps.mp4';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.redirect(HERO_VIDEO_URL, {
    status: 307,
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
    },
  });
}
