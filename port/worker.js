// Cloudflare Worker: only fixed, public release assets from this repository.
const upstream = 'https://github.com/qbekun/Yosuga-no-Sora/releases/download/web-assets-v1/';
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = env.ALLOWED_ORIGIN || 'https://qbekun.github.io';
    const cors = {'Access-Control-Allow-Origin': origin, 'Vary': 'Origin'};
    if (request.method === 'OPTIONS') return new Response(null, {headers: {...cors, 'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS'}});
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405, headers: cors});
    const name = url.pathname.slice(1);
    if (!/^(?:[a-z0-9_]+-\d{4}\.bin|opening\.mp4|manifest\.json)$/.test(name))
      return new Response('Not found', {status: 404, headers: cors});
    const cache = caches.default;
    const key = new Request(url.href, {method: 'GET'});
    let response = await cache.match(key);
    if (!response) {
      const upstreamResponse = await fetch(upstream + name);
      if (!upstreamResponse.ok) return new Response('Asset unavailable', {status: upstreamResponse.status, headers: cors});
      const headers = new Headers(upstreamResponse.headers);
      headers.delete('Content-Disposition');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Content-Type', name.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream');
      response = new Response(upstreamResponse.body, {headers});
      ctx.waitUntil(cache.put(key, response.clone()));
    }
    const headers = new Headers(response.headers);
    Object.entries(cors).forEach(([key, value]) => headers.set(key, value));
    return new Response(request.method === 'HEAD' ? null : response.body, {headers});
  }
};
