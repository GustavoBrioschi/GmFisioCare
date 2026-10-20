// Compare to the destination of this request; no fixed domain or port setting.
// Host is the destination authority, never a free-form forwarded-host header.
export function isAllowedOrigin(request, { vercel = false } = {}) {
  try {
    if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
    const origin = new URL(request.headers.get('origin'));
    const target = new URL(request.url);
    const host = request.headers.get('host') || target.host;
    const protocol = vercel && request.headers.get('x-forwarded-proto') === 'https' ? 'https:' : target.protocol;
    return ['http:', 'https:'].includes(origin.protocol) && origin.host === host && origin.protocol === protocol;
  } catch { return false; }
}
