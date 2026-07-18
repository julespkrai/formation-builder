'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function LogoutButton({ isDemoMode = false }: { isDemoMode?: boolean }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    if (isDemoMode) {
      await fetch('/api/auth/demo', { method: 'DELETE' })
    } else {
      await supabase.auth.signOut()
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition"
    >
      <LogOut size={14} />
      Déconnexion
    </button>
  )
}
