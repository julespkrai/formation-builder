import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import type { Formation } from '@/lib/types'
import {
  DEMO_FORMATIONS,
  DEMO_MODULES,
  DEMO_USER_EMAIL,
} from '@/lib/demo-data'
import NewFormationButton from './NewFormationButton'
import LogoutButton from '@/components/LogoutButton'

export default async function FormationsPage() {
  const cookieStore = await cookies()
  const demoAuth = cookieStore.get('demo_auth')?.value === 'true'

  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch { /* Supabase not configured */ }

  if (!user && !demoAuth) redirect('/login')

  const userEmail = user?.email ?? DEMO_USER_EMAIL
  const userId = user?.id ?? 'demo-user-id'

  let formations: Formation[] = []
  let countByFormation: Record<string, number> = {}

  if (user) {
    const { data } = await supabase
      .from('formations')
      .select('*')
      .order('updated_at', { ascending: false })
    formations = (data ?? []) as Formation[]

    const { data: moduleCounts } = await supabase.from('modules').select('formation_id')
    countByFormation = (moduleCounts ?? []).reduce<Record<string, number>>((acc, m) => {
      acc[m.formation_id] = (acc[m.formation_id] ?? 0) + 1
      return acc
    }, {})
  } else {
    formations = DEMO_FORMATIONS
    countByFormation = Object.fromEntries(
      Object.entries(DEMO_MODULES).map(([fid, mods]) => [fid, mods.length])
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-ocean text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sun flex items-center justify-center">
            <span className="text-ocean font-bold text-sm">F</span>
          </div>
          <span className="font-semibold">Formation Builder</span>
          {demoAuth && (
            <span className="text-xs bg-sun text-ocean px-2 py-0.5 rounded-full font-medium">Démo</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">{userEmail}</span>
          <LogoutButton isDemoMode={demoAuth} />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mes formations</h1>
          <NewFormationButton userId={userId} disabled={demoAuth} />
        </div>

        {demoAuth && (
          <div className="bg-sun/30 border border-sun rounded-xl px-4 py-3 mb-6 text-sm text-ocean">
            Mode démo — les données sont fictives. Connectez Supabase pour créer vos vraies formations.
          </div>
        )}

        {!formations.length ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">📚</span>
            </div>
            <h2 className="text-lg font-medium text-gray-700 mb-2">Aucune formation</h2>
            <p className="text-gray-400 text-sm mb-6">Créez votre première formation pour commencer</p>
            <NewFormationButton userId={userId} disabled={demoAuth} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {formations.map(f => (
              <Link
                key={f.id}
                href={`/formations/${f.id}`}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-ocean/30 hover:shadow-sm transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[f.status]}`}>
                    {STATUS_LABELS[f.status]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {countByFormation[f.id] ?? 0} module{(countByFormation[f.id] ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-ocean transition mb-1 line-clamp-2">
                  {f.title}
                </h3>
                {f.description && (
                  <p className="text-sm text-gray-400 line-clamp-2">{f.description}</p>
                )}
                <p className="text-xs text-gray-300 mt-3">
                  {new Date(f.updated_at).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
