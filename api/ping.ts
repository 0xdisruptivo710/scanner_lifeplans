export function GET(_req: Request): Response {
  return Response.json({
    ok: true,
    msg: 'pong',
    has_wts_token: !!(process.env.WTS_TOKEN_ITUPEVA || process.env.VITE_WTS_TOKEN_ITUPEVA),
    runtime: 'vercel-functions',
    ts: new Date().toISOString(),
  });
}
