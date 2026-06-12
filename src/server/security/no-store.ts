import { NextResponse } from 'next/server';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
  'Surrogate-Control': 'no-store',
} as const;

export function applyNoStoreHeaders(response: NextResponse) {
  Object.entries(NO_STORE_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function noStoreJson<TBody>(body: TBody, init?: ResponseInit) {
  return applyNoStoreHeaders(NextResponse.json(body, init));
}

export function noStoreDownload(body: BodyInit, init?: ResponseInit) {
  return applyNoStoreHeaders(new NextResponse(body, init));
}

export { NO_STORE_HEADERS };
