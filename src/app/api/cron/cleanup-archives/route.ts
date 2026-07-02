import { NextResponse } from 'next/server'
import { cleanupExpiredArchives } from '@/app/(app)/admin/archives/actions'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  // Vercel cron uses Bearer token format for CRON_SECRET
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    authHeader !== process.env.CRON_SECRET
  ) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const result = await cleanupExpiredArchives()
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Cron cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
