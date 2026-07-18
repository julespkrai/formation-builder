import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (
    email === process.env.DEMO_EMAIL &&
    password === process.env.DEMO_PASSWORD
  ) {
    const res = NextResponse.json({ success: true })
    res.cookies.set('demo_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  }

  return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('demo_auth', '', { maxAge: 0, path: '/' })
  return res
}
