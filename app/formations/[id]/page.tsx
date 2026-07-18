import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  DEMO_FORMATIONS,
  DEMO_MODULES,
  DEMO_RESOURCES,
  DEMO_KNOWLEDGE_BASE,
} from '@/lib/demo-data'
import FormationEditor from './FormationEditor'
import type { ModuleWithCourses, Resource, KnowledgeBase } from '@/lib/types'

export default async function FormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const demoAuth = cookieStore.get('demo_auth')?.value === 'true'

  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch { /* Supabase not configured */ }

  if (!user && !demoAuth) redirect('/login')

  if (demoAuth && !user) {
    const formation = DEMO_FORMATIONS.find(f => f.id === id)
    if (!formation) notFound()
    return (
      <Suspense fallback={null}>
        <FormationEditor
          formation={formation}
          modules={DEMO_MODULES[id] ?? []}
          resources={(DEMO_RESOURCES[id] ?? []) as Resource[]}
          knowledgeBase={(DEMO_KNOWLEDGE_BASE[id] ?? []) as KnowledgeBase[]}
          demoMode
        />
      </Suspense>
    )
  }

  const { data: formation } = await supabase
    .from('formations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!formation) notFound()

  const { data: modules } = await supabase
    .from('modules')
    .select('*')
    .eq('formation_id', id)
    .order('order')

  const moduleIds = (modules ?? []).map(m => m.id)
  const { data: courses } = moduleIds.length
    ? await supabase.from('courses').select('*').in('module_id', moduleIds).order('order')
    : { data: [] }

  const modulesWithCourses: ModuleWithCourses[] = (modules ?? []).map(m => ({
    ...m,
    courses: (courses ?? []).filter(c => c.module_id === m.id),
  }))

  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('formation_id', id)
    .order('created_at')

  const { data: knowledgeBase } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('formation_id', id)
    .order('created_at')

  return (
    <Suspense fallback={null}>
      <FormationEditor
        formation={formation}
        modules={modulesWithCourses}
        resources={(resources ?? []) as Resource[]}
        knowledgeBase={(knowledgeBase ?? []) as KnowledgeBase[]}
      />
    </Suspense>
  )
}
