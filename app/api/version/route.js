export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(
    { buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || 'dev' },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
