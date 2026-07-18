import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import QuizEditor from './QuizEditor'
import type { Quiz } from '@/lib/types'

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; moduleId: string }>
}) {
  const { id, moduleId } = await params
  const cookieStore = await cookies()
  const demoAuth = cookieStore.get('demo_auth')?.value === 'true'

  const supabase = await createClient()
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {}

  if (!user && !demoAuth) redirect('/login')

  if (demoAuth && !user) {
    return (
      <QuizEditor
        formationId={id}
        moduleId={moduleId}
        moduleTitle="Module (démo)"
        quiz={null}
        demoMode
      />
    )
  }

  const [{ data: module_ }, { data: quiz }] = await Promise.all([
    supabase.from('modules').select('title').eq('id', moduleId).single(),
    supabase.from('quizzes').select('*').eq('module_id', moduleId).maybeSingle(),
  ])

  if (!module_) notFound()

  return (
    <QuizEditor
      formationId={id}
      moduleId={moduleId}
      moduleTitle={module_.title}
      quiz={quiz as Quiz | null}
    />
  )
}
