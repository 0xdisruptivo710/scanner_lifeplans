export const config = {
  // Default Vercel Functions (Fluid Compute, Node 24)
};

export default async function handler(req: Request): Promise<Response> {
  const token = process.env.WTS_TOKEN_ITUPEVA || process.env.VITE_WTS_TOKEN_ITUPEVA;
  if (!token) {
    return Response.json(
      { error: 'WTS_TOKEN_ITUPEVA not configured on server' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const targetPath = url.pathname.replace(/^\/api\/wts/, '') || '/';
  const target = `https://api.wts.chat${targetPath}${url.search}`;

  const headers: Record<string, string> = {
    Authorization: token,
    accept: 'application/json',
  };
  const ct = req.headers.get('content-type');
  if (ct) headers['content-type'] = ct;

  let body: string | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: req.method, headers, body });
  } catch (err) {
    return Response.json(
      { error: 'upstream_fetch_failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}
