export async function POST() {
  return new Response(null, {
    status: 410,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}
