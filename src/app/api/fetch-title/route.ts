import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ title: null })

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Mate/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await response.text()
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = match ? match[1].trim().replace(/\s+/g, ' ') : null
    return NextResponse.json({ title })
  } catch {
    return NextResponse.json({ title: null })
  }
}
