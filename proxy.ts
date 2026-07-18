import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Demo mode bypass (no Supabase needed)
  const demoAuth = request.cookies.get('demo_auth')?.value === 'true'

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Supabase not configured — demo mode handles auth
  }

  const isAuthenticated = !!user || demoAuth

  if (!isAuthenticated && request.nextUrl.pathname.startsWith('/formations')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthenticated && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/formations', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/formations/:path*', '/login'],
}
